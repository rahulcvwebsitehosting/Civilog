import * as XLSX from 'xlsx';
import { ODRequest, TeamMember } from '../types';

/**
 * Formats a date string to DD-MM-YYYY
 */
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Formats a timestamp to DD-MM-YYYY HH:mm:ss
 */
const formatTimestamp = (dateString: string | null | undefined): string => {
  if (!dateString) return 'PENDING';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'PENDING';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Calculates duration between two dates
 */
const calculateDuration = (start: string | null | undefined, end: string | null | undefined): string => {
  if (!start) return 'N/A';
  if (!end || start === end) return '1 Day';
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'N/A';
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
};

export const exportODRequestsToExcel = (
  requests: ODRequest[], 
  department?: string,
  onError?: (message: string) => void
) => {
  const data = requests.map((req, index) => {
    // Robustly handle team members (could be array, stringified JSON, or null)
    let teamList: TeamMember[] = [];
    try {
      if (Array.isArray(req.team_members)) {
        teamList = req.team_members;
      } else if (typeof req.team_members === 'string') {
        teamList = JSON.parse(req.team_members);
      }
    } catch (e) {
      console.error("Error parsing team members for export:", e);
    }

    const teamDetails = teamList && teamList.length > 0
      ? teamList.map(m => `${m.name} (${m.register_no})`).join('; ')
      : 'INDIVIDUAL';

    return {
      '[SR.NO]': index + 1,
      '[STUDENT] Name': req.student_name || 'N/A',
      '[STUDENT] Roll No': req.roll_no || 'N/A',
      '[STUDENT] Register No': req.register_no || 'N/A',
      '[STUDENT] Year': req.year || 'N/A',
      '[STUDENT] Department': req.department || 'N/A',
      '[STUDENT] Semester': req.semester || 'N/A',
      '[TEAM] Member Details': teamDetails,
      '[EVENT] Title': req.event_title || 'N/A',
      '[EVENT] Category': req.event_type || 'N/A',
      '[EVENT] Organization': req.organization_name || 'N/A',
      '[EVENT] Location': req.organization_location || 'N/A',
      '[PERIOD] Start Date': formatDate(req.event_date),
      '[PERIOD] End Date': formatDate(req.event_end_date),
      '[PERIOD] Duration': calculateDuration(req.event_date, req.event_end_date),
      '[STATUS] Current Status': req.status || 'N/A',
      '[APPROVAL] Coordinator Status': formatTimestamp(req.coordinator_approved_at),
      '[APPROVAL] HOD Status': formatTimestamp(req.hod_approved_at),
      '[LINKS] Evidence': `Registration: ${req.registration_proof_url || 'N/A'} | OD Letter: ${req.od_letter_url || 'N/A'}`
    };
  });

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'OD Requests');

    // Set column widths for better readability
    const wscols = [
      { wch: 8 },  // SR.NO
      { wch: 25 }, // Name
      { wch: 15 }, // Roll No
      { wch: 15 }, // Reg No
      { wch: 8 },  // Year
      { wch: 20 }, // Dept
      { wch: 10 }, // Sem
      { wch: 40 }, // Team
      { wch: 30 }, // Title
      { wch: 15 }, // Category
      { wch: 30 }, // Org
      { wch: 20 }, // Location
      { wch: 15 }, // Start
      { wch: 15 }, // End
      { wch: 12 }, // Duration
      { wch: 20 }, // Status
      { wch: 25 }, // Coordinator
      { wch: 25 }, // HOD
      { wch: 60 }  // Links
    ];
    worksheet['!cols'] = wscols;

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const deptName = department ? department.toUpperCase().replace(/\s+/g, '_') : 'ALL';
    const filename = `ESEC_OD_REPORT_${deptName}_${date}.xlsx`;

    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Excel Export Error:", error);
    if (onError) {
      onError("Failed to generate Excel report. Please try again.");
    } else {
      console.error("Excel Export Error:", error);
    }
  }
};
