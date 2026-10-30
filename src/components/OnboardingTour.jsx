import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar,
  CalendarCheck2,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useI18n } from '../services/i18n';

export default function OnboardingTour({
  isOpen,
  onClose,
  activeTab,
  onSetTab,
  calendarViewMode,
  onSetCalendarViewMode
}) {
  const { t } = useI18n();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [popoverStyle, setPopoverStyle] = useState({});
  const retryTimeoutRef = useRef(null);

  const steps = [
    {
      id: 'step-1',
      stepNumber: '1',
      badge: t('tourStep1Badge'),
      title: t('tourStep1Title'),
      description: t('tourStep1Desc'),
      selector: '[data-tour="event-sidebar"]',
      fallbackSelector: '.event-sidebar',
      tab: 'heatmap',
      viewMode: null,
      icon: Calendar
    },
    {
      id: 'step-2',
      stepNumber: '2',
      badge: t('tourStep2Badge'),
      title: t('tourStep2Title'),
      description: t('tourStep2Desc'),
      selector: '[data-tour="calendar-availability-container"]',
      fallbackSelector: '[data-tour="tab-voting"]',
      tab: 'voting',
      viewMode: 'week',
      icon: CalendarCheck2
    },
    {
      id: 'step-2-1',
      stepNumber: '2.1',
      badge: t('tourStep2_1Badge'),
      title: t('tourStep2_1Title'),
      description: t('tourStep2_1Desc'),
      selector: '[data-tour="date-suggestions-section"]',
      fallbackSelector: '[data-tour="date-suggestions-tab-btn"]',
      tab: 'voting',
      viewMode: 'suggestions',
      icon: Sparkles
    },
    {
      id: 'step-3',
      stepNumber: '3',
      badge: t('tourStep3Badge'),
      title: t('tourStep3Title'),
      description: t('tourStep3Desc'),
      selector: '[data-tour="smart-suggestions-section"]',
      fallbackSelector: '[data-tour="tab-suggestions"]',
      tab: 'suggestions',
      viewMode: null,
      icon: Sparkles
    },
    {
      id: 'step-4',
      stepNumber: '4',
      badge: t('tourStep4Badge'),
      title: t('tourStep4Title'),
      description: t('tourStep4Desc'),
      selector: '[data-tour="location-suggestions-section"]',
      fallbackSelector: '[data-tour="tab-locations"]',
      tab: 'locations',
      viewMode: null,
      icon: MapPin
    }
  ];

  const currentStep = steps[currentStepIndex] || steps[0];
  const StepIcon = currentStep.icon;

  // Atualiza coordenadas do elemento alvo e posiciona o popover
  const updatePosition = useCallback(() => {
    if (!isOpen) return;
    const step = steps[currentStepIndex];
    if (!step) return;

    let el = document.querySelector(step.selector);
    if (!el && step.fallbackSelector) {
      el = document.querySelector(step.fallbackSelector);
    }

    if (!el) {
      // Se não encontrou o elemento, posiciona no centro
      setTargetRect(null);
      setPopoverStyle({
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 440,
        width: '90%'
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // No celular: fixa embaixo com visual sheet ergonômico
      setPopoverStyle({
        position: 'fixed',
        bottom: 16,
        left: 12,
        right: 12,
        maxWidth: 'calc(100% - 24px)',
        margin: '0 auto',
        transform: 'none'
      });
    } else {
      // No desktop: posiciona inteligentemente ao lado ou abaixo do alvo
      const cardWidth = 380;
      const cardHeight = 260;
      const padding = 16;
      let left = 20;
      let top = 100;

      if (step.id === 'step-1') {
        // Passo 1: Sidebar à esquerda -> posiciona card à direita da sidebar
        left = Math.min(rect.right + padding, window.innerWidth - cardWidth - 20);
        top = Math.max(85, Math.min(rect.top + 20, window.innerHeight - cardHeight - 20));
      } else {
        // Demais passos: verifica se cabe à direita, abaixo ou à esquerda
        const spaceRight = window.innerWidth - rect.right;
        const spaceBelow = window.innerHeight - rect.bottom;

        if (spaceRight >= cardWidth + padding + 20) {
          left = rect.right + padding;
          top = Math.max(85, Math.min(rect.top, window.innerHeight - cardHeight - 20));
        } else if (spaceBelow >= cardHeight + padding) {
          left = Math.max(20, Math.min(rect.left, window.innerWidth - cardWidth - 20));
          top = rect.bottom + padding;
        } else {
          // Fallback: canto superior direito ou inferior direito da tela
          left = Math.max(20, window.innerWidth - cardWidth - 30);
          top = Math.max(90, window.innerHeight - cardHeight - 30);
        }
      }

      setPopoverStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${cardWidth}px`,
        transform: 'none'
      });
    }
  }, [isOpen, currentStepIndex, steps]);

  // Altera abas e sincroniza visualizações ao mudar de passo
  useEffect(() => {
    if (!isOpen) return;
    const step = steps[currentStepIndex];
    if (!step) return;

    if (step.tab && onSetTab) {
      onSetTab(step.tab);
    }
    if (step.viewMode && onSetCalendarViewMode) {
      onSetCalendarViewMode(step.viewMode);
    }

    // Scroll suave para o elemento em visualização após pequena pausa de renderização
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => {
      let el = document.querySelector(step.selector);
      if (!el && step.fallbackSelector) {
        el = document.querySelector(step.fallbackSelector);
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
      updatePosition();
    }, 120);

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [currentStepIndex, isOpen]);

  // Sincroniza resize e scroll
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const timer = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      clearTimeout(timer);
    };
  }, [isOpen, updatePosition]);

  // Navegação por teclado: Setas e Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    try {
      localStorage.setItem('event_schedule_onboarding_completed', 'true');
    } catch (e) {
      console.warn('Could not save onboarding status to localStorage', e);
    }
    onClose();
  };

  const handleFinish = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.7 }
      });
      localStorage.setItem('event_schedule_onboarding_completed', 'true');
    } catch (e) {
      console.warn('Could not save onboarding status to localStorage', e);
    }
    onClose();
  };

  const pad = 8;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="onboarding-tour-root" role="dialog" aria-modal="true" aria-label="Tutorial do Sistema">
      {/* Máscara SVG com recorte do elemento em destaque (Spotlight) */}
      <svg className="onboarding-overlay-svg" width="100%" height="100%">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - pad)}
                y={Math.max(0, targetRect.top - pad)}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#tour-spotlight-mask)"
          onClick={handleNext}
          style={{ cursor: 'pointer' }}
        />
      </svg>

      {/* Caixa de Realce com Borda Pulsante e Brilho */}
      {targetRect && (
        <div
          className="onboarding-spotlight-box"
          style={{
            position: 'fixed',
            left: Math.max(0, targetRect.left - pad),
            top: Math.max(0, targetRect.top - pad),
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            borderRadius: 14,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Card Flutuante de Conteúdo e Controles */}
      <div className="onboarding-popover-card" style={popoverStyle}>
        {/* Cabeçalho do Card */}
        <div className="onboarding-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="onboarding-step-pill">
              Passo {currentStep.stepNumber}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {t('tourStepOf', { current: currentStepIndex + 1, total: steps.length })}
            </span>
          </div>

          <button
            type="button"
            className="onboarding-close-btn"
            onClick={handleClose}
            title={t('tourSkip')}
            aria-label={t('tourSkip')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo: Título e Descrição */}
        <div className="onboarding-card-body">
          <h3 className="onboarding-card-title">
            <span className="onboarding-icon-wrapper">
              <StepIcon size={18} color="var(--primary)" />
            </span>
            <span>{currentStep.title}</span>
          </h3>

          <p className="onboarding-card-description">
            {currentStep.description}
          </p>
        </div>

        {/* Rodapé: Indicadores de Passo e Ações */}
        <div className="onboarding-card-footer">
          {/* Indicadores Visuais de Passo (Dots) */}
          <div className="onboarding-dots" aria-hidden="true">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className={`onboarding-dot ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}`}
                onClick={() => setCurrentStepIndex(idx)}
                title={s.title}
              />
            ))}
          </div>

          {/* Botões de Ação */}
          <div className="onboarding-actions">
            {!isLastStep && (
              <button
                type="button"
                className="onboarding-btn-text"
                onClick={handleClose}
              >
                {t('tourSkip')}
              </button>
            )}

            {currentStepIndex > 0 && (
              <button
                type="button"
                className="onboarding-btn-secondary"
                onClick={handlePrev}
                title={t('tourPrev')}
              >
                <ChevronLeft size={16} />
                <span>{t('tourPrev')}</span>
              </button>
            )}

            <button
              type="button"
              className="onboarding-btn-primary"
              onClick={handleNext}
              autoFocus
            >
              <span>{isLastStep ? t('tourFinish') : t('tourNext')}</span>
              {isLastStep ? <CheckCircle2 size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
