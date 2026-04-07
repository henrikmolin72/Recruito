/**
 * Email templates for user notifications
 * All templates use HTML formatting for better email client support
 */

const BRAND_COLOR = "#0066cc";
const GRAY_TEXT = "#666666";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const emailHeaderStyle = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: ${GRAY_TEXT};
  line-height: 1.6;
`;

export function newJobNotificationEmail({
  recruiterName,
  jobTitle,
  companyName,
  location,
  feePercentage,
  jobUrl,
}: {
  recruiterName: string;
  jobTitle: string;
  companyName: string;
  location: string;
  feePercentage: number;
  jobUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="${emailHeaderStyle}">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #000; margin-bottom: 20px;">Hi ${escapeHtml(recruiterName)}!</h2>

        <p>A new job listing matching your specialization has been posted:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #000; margin-top: 0;">${escapeHtml(jobTitle)}</h3>
          <p style="margin: 8px 0;"><strong>Company:</strong> ${escapeHtml(companyName)}</p>
          <p style="margin: 8px 0;"><strong>Location:</strong> ${escapeHtml(location)}</p>
          <p style="margin: 8px 0;"><strong>Fee:</strong> ${feePercentage}%</p>
        </div>

        <p>
          <a href="${encodeURI(jobUrl)}" style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Job Posting
          </a>
        </p>

        <p style="margin-top: 40px; color: #999; font-size: 12px;">
          You received this email because you're a recruiter on Recruito with matching specializations or locations for this job.
        </p>
      </div>
    </body>
    </html>
  `;
}

export function candidateSubmissionEmail({
  companyName,
  candidateName,
  candidateTitle,
  jobTitle,
  qualifications,
  candidateUrl,
}: {
  companyName: string;
  candidateName: string;
  candidateTitle: string;
  jobTitle: string;
  qualifications: string;
  candidateUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="${emailHeaderStyle}">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #000; margin-bottom: 20px;">New Candidate Submission</h2>

        <p>A recruiter has submitted a candidate for your job posting:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #000; margin-top: 0;">${escapeHtml(candidateName)}</h3>
          <p style="margin: 8px 0;"><strong>Current Title:</strong> ${escapeHtml(candidateTitle)}</p>
          <p style="margin: 8px 0;"><strong>Applying for:</strong> ${escapeHtml(jobTitle)}</p>
          <p style="margin: 8px 0;"><strong>Key Qualifications:</strong></p>
          <p style="margin: 8px 0; color: #000;">${escapeHtml(qualifications)}</p>
        </div>

        <p>
          <a href="${encodeURI(candidateUrl)}" style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Candidate
          </a>
        </p>

        <p style="margin-top: 40px; color: #999; font-size: 12px;">
          You received this email because a recruiter submitted a candidate for one of your job postings on Recruito.
        </p>
      </div>
    </body>
    </html>
  `;
}

export function candidateProgressEmail({
  recruiterName,
  candidateName,
  jobTitle,
  newStage,
  candidateUrl,
}: {
  recruiterName: string;
  candidateName: string;
  jobTitle: string;
  newStage: string;
  candidateUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="${emailHeaderStyle}">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #000; margin-bottom: 20px;">Candidate Progressed</h2>

        <p>The company has moved your candidate forward in the hiring process:</p>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #000; margin-top: 0;">${escapeHtml(candidateName)}</h3>
          <p style="margin: 8px 0;"><strong>Job Position:</strong> ${escapeHtml(jobTitle)}</p>
          <p style="margin: 8px 0;"><strong>New Stage:</strong> <span style="color: ${BRAND_COLOR}; font-weight: bold;">${escapeHtml(newStage)}</span></p>
        </div>

        <p>Great news! Keep in touch with the candidate and stay updated on their progress.</p>

        <p>
          <a href="${encodeURI(candidateUrl)}" style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Candidate Status
          </a>
        </p>

        <p style="margin-top: 40px; color: #999; font-size: 12px;">
          You received this email because a company has updated the status of one of your candidate submissions on Recruito.
        </p>
      </div>
    </body>
    </html>
  `;
}
