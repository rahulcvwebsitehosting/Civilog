
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
  switch (year) {
    case '1': return '1st Year';
    case '2': return '2nd Year';
    case '3': return '3rd Year';
    case '4': return '4th Year';
    default: return `${year} Year`;
  }
};

/**
 * Generates the professional OD letter.
 * Handles signatures for Lead and all Team Members.
 */
export const generateODDocument = async (request: ODRequest, studentProfile: Profile, facultyProfile?: Profile): Promise<Blob> => {
  const doc = new jsPDF();
  doc.setFont('times', 'normal');
  
  // Header
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('ERODE SENGUNTHAR ENGINEERING COLLEGE', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('ERODE - 638057', 105, 20, { align: 'center' });
  doc.line(20, 23, 190, 23);

  let y = 35;
  const leftMargin = 20;

  // Parse team members (defensive against string/object differences in some DB versions)
  const teamMembersRaw = request.team_members;
  const teamMembers: TeamMember[] = Array.isArray(teamMembersRaw) 
    ? teamMembersRaw 
    : (typeof teamMembersRaw === 'string' ? JSON.parse(teamMembersRaw) : []);

  // From Section
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('From:', leftMargin, y); y += 7;
  
  // Lead Student
  doc.text(`${request.student_name} (${getOrdinalYear(request.year)})`, leftMargin, y); y += 7;
  
  // List other members in header
  if (teamMembers.length > 0) {
    teamMembers.forEach(member => {
       doc.text(`${member.name} (${getOrdinalYear(member.year)})`, leftMargin, y); y += 7;
    });
  }

  doc.text('Civil Engineering Department,', leftMargin, y); y += 7;
  doc.text('Erode Sengunthar Engineering College,', leftMargin, y); y += 7;
  doc.text('Erode, 638057.', leftMargin, y); y += 15;

  // To Section
  doc.text('To:', leftMargin, y); y += 7;
  doc.text('The Advisor,', leftMargin, y); y += 7;
  doc.text('Civil Engineering Department,', leftMargin, y); y += 7;
  doc.text('Erode Sengunthar Engineering College.', leftMargin, y); y += 15;

  // Subject
  doc.setFont(undefined, 'bold');
  const subjectText = `Subject: Request for on-duty for ${request.event_type} - ${request.event_title} in ${request.organization_name}`;
  const splitSubject = doc.splitTextToSize(subjectText, 170);
  doc.text(splitSubject, leftMargin, y); 
  y += (splitSubject.length * 7) + 10;
  doc.setFont(undefined, 'normal');

  // Salutation
  doc.text('Respected Sir/Mam,', leftMargin, y); y += 12;

  // Body
  const teamLeadStr = `${request.student_name} (${getOrdinalYear(request.year)})`;
  const othersStr = teamMembers.length > 0 
    ? " and " + teamMembers.map(m => `${m.name} (${getOrdinalYear(m.year)})`).join(', ') 
    : "";
  
  const startDateStr = formatFullDate(request.event_date);
  const endDateStr = request.event_end_date ? formatFullDate(request.event_end_date) : startDateStr;
  
  let dateRangeText = "";
  if (startDateStr === endDateStr) {
    dateRangeText = `on ${startDateStr}`;
  } else {
    dateRangeText = `from ${startDateStr} to ${endDateStr}`;
  }
  
  const bodyText = `I/We, ${teamLeadStr}${othersStr}, are students of the Civil Engineering department. We wish to participate in the ${request.event_type} titled "${request.event_title}" organized by ${request.organization_name} ${dateRangeText}. Hence, we kindly request you to grant us On-Duty (OD) permission to attend this technical event.`;
  
  const splitBody = doc.splitTextToSize(bodyText, 170);
  doc.text(splitBody, leftMargin, y);
  y += (splitBody.length * 7) + 15;

  doc.text('Thanking You,', leftMargin, y); y += 10;
  doc.text('Yours faithfully,', leftMargin, y); y += 10;

  // Lead Student Signature
  const startSigY = y;
  let currentSigY = startSigY;

  // Check studentProfile.signature_url OR request.remarks (where lead signature is stored)
  const leadSigUrl = studentProfile.signature_url || request.remarks;
  if (leadSigUrl) {
    const sigImg = await loadImage(leadSigUrl);
    if (sigImg) {
      doc.addImage(sigImg, 'PNG', leftMargin, currentSigY, 40, 15, undefined, 'FAST');
    }
  }
  doc.text('__________________________', leftMargin, currentSigY + 20);
  doc.text(`${request.student_name} (Lead)`, leftMargin, currentSigY + 25);
  currentSigY += 35;

  // Additional Member Signatures
  if (teamMembers.length > 0) {
    for (const member of teamMembers) {
      if (currentSigY > 260) {
        doc.addPage();
        currentSigY = 20;
      }
      
      if (member.signature_url) {
        const mSigImg = await loadImage(member.signature_url);
        if (mSigImg) {
          doc.addImage(mSigImg, 'PNG', leftMargin, currentSigY, 40, 15, undefined, 'FAST');
        }
      }
      doc.text('__________________________', leftMargin, currentSigY + 20);
      doc.text(`${member.name} (Member)`, leftMargin, currentSigY + 25);
      currentSigY += 35;
    }
  }

  // Faculty Signature (If Approved)
  if (facultyProfile && facultyProfile.signature_url) {
    const facX = 130;
    // Align with the bottom of the signature list, or if only lead, align with lead.
    // However, faculty usually sign at a fixed spot or after the last student.
    // Let's place it to the right of the Lead signature start for standard format.
    const facY = startSigY; 
    
    const facSigImg = await loadImage(facultyProfile.signature_url);
    if (facSigImg) {
      doc.addImage(facSigImg, 'PNG', facX, facY, 40, 15, undefined, 'FAST');
    }
    doc.text('__________________________', facX, facY + 20);
    doc.text('(Faculty Advisor Signature)', facX, facY + 25);
    
    // Add "Approved" Stamp
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 100, 0); 
    doc.text('APPROVED', 105, facY + 40, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('This is an electronically signed document generated by CivLog OD-Track System.', 105, 285, { align: 'center' });

  return doc.output('blob');
};

export const generateODLetter = async (request: ODRequest, studentProfile: Profile, facultyProfile?: Profile): Promise<Blob> => {
  return generateODDocument(request, studentProfile, facultyProfile);
};
