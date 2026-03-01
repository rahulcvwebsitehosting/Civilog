import { jsPDF } from 'jspdf';
import { ODRequest, Profile, TeamMember } from '../types';

const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.error(`Failed to load image at ${url}`);
      resolve(null);
    };
    img.src = url;
  });
};

const formatFullDate = (dateStr: string) => {
  if (!dateStr) return '';
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, '0');
  const monthName = months[date.getMonth()];
  const yyyy = date.getFullYear();
  return `${dd}-${monthName}-${yyyy}`;
};

const getOrdinalYear = (year: string) => {
  const y = String(year);
  switch (y) {
    case '1': return '1st Year';
    case '2': return '2nd Year';
    case '3': return '3rd Year';
    case '4': return '4th Year';
    default: return `${y} Year`;
  }
};

/**
 * Generates the professional OD letter with robust multi-student participant logic.
 * Constraints: Lead student and additional team members are aggregated and used for grammar logic.
 * Enforced: Strictly single-page output.
 */
export const generateODDocument = async (request: ODRequest, studentProfile: Profile, facultyProfile?: Profile): Promise<Blob> => {
  const PAGE_WIDTH = 210;
  const MARGIN = 20;
  const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  let currentY = MARGIN;

  // --- 1. Participant List Aggregation ---
  const teamMembersRaw = request.team_members;
  const teamMembers: TeamMember[] = Array.isArray(teamMembersRaw) 
    ? teamMembersRaw 
    : (typeof teamMembersRaw === 'string' ? JSON.parse(teamMembersRaw) : []);

  const allParticipants = [
    { name: request.student_name, year: request.year },
    ...teamMembers.map(m => ({ name: m.name, year: m.year }))
  ];

  doc.setFont('times', 'normal');
  
  // --- Page Border ---
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.rect(10, 10, 190, 277);

  // --- Header Section ---
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text('ERODE SENGUNTHAR ENGINEERING COLLEGE (AUTONOMOUS)', 105, currentY + 5, { align: 'center' });
  currentY += 10;
  
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text('ERODE - 638057', 105, currentY, { align: 'center' });
  currentY += 5;
  
  doc.setLineWidth(0.5);
  doc.line(MARGIN, currentY, PAGE_WIDTH - MARGIN, currentY);
  currentY += 15;

  // --- 2. 'From' Section Logic ---
  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.text('From:', MARGIN, currentY); 
  currentY += 7;
  doc.setFont('times', 'normal');
  
  const namesByYear: { [key: string]: string[] } = {};
  allParticipants.forEach(p => {
    const yr = getOrdinalYear(p.year);
    if (!namesByYear[yr]) namesByYear[yr] = [];
    namesByYear[yr].push(p.name);
  });

  const departmentName = request.department ? `${request.department} Department` : 'ESEC Department';

  Object.entries(namesByYear).forEach(([year, names]) => {
    const line = `${names.join(', ')}`;
    const subLine = `${year} - ${request.department || 'ESEC'} Department`;
    
    const splitLine = doc.splitTextToSize(line, CONTENT_WIDTH);
    doc.text(splitLine, MARGIN, currentY);
    currentY += (splitLine.length * 6);
    
    doc.setFontSize(10);
    doc.setFont('times', 'italic');
    doc.text(subLine, MARGIN, currentY);
    currentY += 6;
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
  });

  doc.text(`${departmentName},`, MARGIN, currentY); currentY += 6;
  doc.text('Erode Sengunthar Engineering College,', MARGIN, currentY); currentY += 6;
  doc.text('Erode, 638057.', MARGIN, currentY); currentY += 15;

  // --- To Section ---
  doc.setFont('times', 'bold');
  doc.text('To:', MARGIN, currentY); currentY += 7;
  doc.setFont('times', 'normal');
  doc.text('The Advisor,', MARGIN, currentY); currentY += 6;
  doc.text(`${departmentName},`, MARGIN, currentY); currentY += 6;
  doc.text('Erode Sengunthar Engineering College.', MARGIN, currentY); currentY += 15;

  // --- Subject Section ---
  doc.setFont('times', 'bold');
  const subjectLine = `Subject: Request for on-duty for ${request.event_type} - ${request.event_title} at ${request.organization_name}`;
  const splitSubject = doc.splitTextToSize(subjectLine, CONTENT_WIDTH);
  doc.text(splitSubject, MARGIN, currentY); 
  currentY += (splitSubject.length * 6) + 12;

  // --- Salutation ---
  doc.setFont('times', 'normal');
  doc.text('Respected Sir/Mam,', MARGIN, currentY); currentY += 10;

  // --- 3. Grammatical Switching & Body Construction ---
  const participantNames = allParticipants.map(p => p.name);
  const formattedNames = participantNames.length > 1 
    ? participantNames.slice(0, -1).join(', ') + ' and ' + participantNames.slice(-1)
    : participantNames[0];

  const pronoun = allParticipants.length > 1 ? "We" : "I";
  const identityPhrase = allParticipants.length > 1 ? "are students" : "am a student";
  const requestPhrase = allParticipants.length > 1 ? "request you to allow us" : "request you to allow me";
  
  const eventDateFormatted = formatFullDate(request.event_date);
  const eventEndDateFormatted = request.event_end_date ? formatFullDate(request.event_end_date) : '';
  const dateRangeStr = (request.event_end_date && request.event_end_date !== request.event_date)
    ? `from ${eventDateFormatted} to ${eventEndDateFormatted}`
    : `on ${eventDateFormatted}`;
  
  const bodyText = `${pronoun}, ${formattedNames}, ${identityPhrase} of the ${departmentName}. ${pronoun} wish to participate in the ${request.event_type} titled "${request.event_title}" organized by ${request.organization_name} ${dateRangeStr}. Hence, ${pronoun.toLowerCase()} kindly ${requestPhrase} to attend this technical event and grant On-Duty (OD) permission for the same.`;
  
  const splitBody = doc.splitTextToSize(bodyText, CONTENT_WIDTH);
  doc.text(splitBody, MARGIN, currentY);
  currentY += (splitBody.length * 7) + 15;

  doc.text('Thanking You,', MARGIN, currentY); currentY += 10;
  doc.text('Yours faithfully,', MARGIN, currentY); currentY += 20;

  // --- Footer Signature Section (Strictly single-page) ---
  const signatureX = PAGE_WIDTH - MARGIN - 60;

  if (facultyProfile && facultyProfile.signature_url) {
    const facSigImg = await loadImage(facultyProfile.signature_url);
    if (facSigImg) {
      doc.addImage(facSigImg, 'PNG', signatureX, currentY, 40, 15, undefined, 'FAST');
    }
    currentY += 20;
    doc.setFont('times', 'bold');
    doc.text(`${facultyProfile.full_name}`, signatureX, currentY);
    currentY += 5;
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    // REMOVED / HOD as requested
    doc.text('Faculty Advisor', signatureX, currentY);

    // Approval Stamp
    doc.setFontSize(24);
    doc.setTextColor(34, 197, 94); // Green-500
    doc.setFont('times', 'bold');
    doc.text('APPROVED', 150, currentY - 5, { angle: 15 });
    doc.setTextColor(0, 0, 0);
  } else {
    // Placeholder for Requisition phase
    doc.setFontSize(10);
    doc.text('__________________________', signatureX, currentY + 20);
    doc.text('Faculty Advisor', signatureX, currentY + 25);
  }

  // --- Footer Metadata ---
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Digitally generated by ESEC OD Portal. Faculty authorization required for final validity.', 105, 282, { align: 'center' });

  return doc.output('blob');
};

export const generateODLetter = async (request: ODRequest, studentProfile: Profile, facultyProfile?: Profile): Promise<Blob> => {
  return generateODDocument(request, studentProfile, facultyProfile);
};