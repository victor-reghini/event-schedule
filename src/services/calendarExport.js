/**
 * Utilitários para Integração e Exportação de Calendários
 * Compatível com:
 * - Google Calendar
 * - Microsoft Outlook Calendar
 * - Apple Calendar / iCalendar (.ics)
 */

function formatIcsDateTime(dateStr, timeStr) {
  // Converte "YYYY-MM-DD" e "HH:MM" para "YYYYMMDDTHHMMSS"
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

/**
 * Gera arquivo .ics (iCalendar) para download imediato
 */
export function downloadIcsFile(event, slot) {
  const dtStart = formatIcsDateTime(slot.date, slot.startTime);
  const dtEnd = formatIcsDateTime(slot.date, slot.endTime);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const uid = `${event.id}_${slot.date}_${slot.startTime}@sincroniza.app`;
  const location = event.locationDetails || (event.locationType === 'online' ? 'Reunião Online' : 'Presencial');
  const summary = event.title;
  const description = `${event.description || ''}\\nOrganizado por: ${event.organizer?.name || 'Organizador'}\\nAgendado via Sincroniza`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sincroniza//Agendador de Eventos Coletivo//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.toLowerCase().replace(/\s+/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Cria URL direta para o Google Calendar
 */
export function getGoogleCalendarUrl(event, slot) {
  const dtStart = formatIcsDateTime(slot.date, slot.startTime);
  const dtEnd = formatIcsDateTime(slot.date, slot.endTime);
  const location = encodeURIComponent(event.locationDetails || '');
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    `${event.description || ''}\n\nOrganizado por: ${event.organizer?.name || ''}\nAgendado via Sincroniza`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
}

/**
 * Cria URL direta para o Outlook Web Calendar
 */
export function getOutlookCalendarUrl(event, slot) {
  const startIso = `${slot.date}T${slot.startTime}:00`;
  const endIso = `${slot.date}T${slot.endTime}:00`;
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(`${event.description || ''}\n\nAgendado via Sincroniza`);
  const location = encodeURIComponent(event.locationDetails || '');

  return `https://outlook.live.com/calendar/0/action/compose?rru=addevent&subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}&location=${location}`;
}
