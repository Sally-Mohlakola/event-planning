// PDFSignatureAttachment.js
// Utility to create a signature details page that gets attached to the contract PDF

/**
 * Generates an HTML document with signature details that can be converted to PDF
 * and attached to the original contract
 */
export const generateSignatureDetailsHTML = (contract, signatureData, signerInfo) => {
  const signedDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  const signatureFields = contract.signatureFields?.filter(
    field => field.signerRole === 'client'
  ) || [];

  let signaturesHTML = '';
  
  signatureFields.forEach((field) => {
    const data = signatureData[field.id];
    const fieldType = field.type;
    let displayValue = '';

    if (fieldType === 'signature' || fieldType === 'initial') {
      displayValue = `<img src="${data}" style="max-width: 300px; max-height: 80px; border: 1px solid #ddd; padding: 5px; background: white;" alt="${field.label}" />`;
    } else if (fieldType === 'date') {
      displayValue = `<span style="font-weight: 600; color: #059669;">${data}</span>`;
    } else if (fieldType === 'text') {
      displayValue = `<span style="font-weight: 600; color: #1e293b;">${data}</span>`;
    } else if (fieldType === 'checkbox') {
      displayValue = `<span style="font-weight: 600; color: ${data ? '#059669' : '#dc2626'};">${data ? '✓ Checked' : '✗ Not Checked'}</span>`;
    }

    signaturesHTML += `
      <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 6px;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 8px; text-transform: uppercase; font-size: 12px;">
          ${field.label} ${field.required ? '<span style="color: #dc2626;">*</span>' : ''}
        </div>
        <div style="margin-top: 10px;">
          ${displayValue}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
          Field Type: ${fieldType} | Required: ${field.required ? 'Yes' : 'No'}
        </div>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contract Signature Details</title>
      <style>
        @page {
          margin: 0.75in;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: white;
          padding: 40px;
        }
        .header {
          text-align: center;
          padding-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          margin-bottom: 40px;
        }
        .header h1 {
          font-size: 28px;
          color: #1e293b;
          margin-bottom: 10px;
          font-weight: 700;
        }
        .header p {
          font-size: 14px;
          color: #64748b;
        }
        .section {
          margin-bottom: 35px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .info-item {
          padding: 12px;
          background: #f8fafc;
          border-radius: 6px;
          border-left: 3px solid #2563eb;
        }
        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }
        .certificate {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 2px solid #0284c7;
          border-radius: 8px;
          padding: 25px;
          margin-top: 30px;
        }
        .certificate h3 {
          color: #075985;
          font-size: 16px;
          margin-bottom: 12px;
          text-align: center;
        }
        .certificate p {
          font-size: 13px;
          color: #0369a1;
          line-height: 1.8;
          text-align: center;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
        }
        .signature-badge {
          display: inline-block;
          padding: 6px 12px;
          background: #d1fae5;
          color: #065f46;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Electronic Signature Certificate</h1>
        <p>Official Signature Verification Document</p>
        <div class="signature-badge">LEGALLY BINDING ELECTRONIC SIGNATURE</div>
      </div>

      <div class="section">
        <div class="section-title">📄 Contract Information</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Contract Name</div>
            <div class="info-value">${contract.fileName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Event</div>
            <div class="info-value">${contract.eventName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Client Name</div>
            <div class="info-value">${contract.clientName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Client Email</div>
            <div class="info-value">${contract.clientEmail}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🕐 Signing Details</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Signed Date & Time</div>
            <div class="info-value">${signedDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Signer IP Address</div>
            <div class="info-value">${signerInfo.ipAddress || 'Not captured'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Device Information</div>
            <div class="info-value">${signerInfo.userAgent ? navigator.platform : 'Not captured'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Signature Method</div>
            <div class="info-value">Electronic Signature</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">✍️ Completed Signature Fields</div>
        ${signaturesHTML}
      </div>

      <div class="certificate">
        <h3>⚖️ Legal Certification</h3>
        <p>
          This document certifies that the electronic signatures and data shown above were captured 
          at the date and time specified. These electronic signatures are legally binding and have 
          the same force and effect as handwritten signatures under applicable electronic signature laws, 
          including but not limited to the U.S. Electronic Signatures in Global and National Commerce Act (ESIGN), 
          the Uniform Electronic Transactions Act (UETA), and other relevant legislation.
        </p>
      </div>

      <div class="footer">
        <p>This signature details page is automatically generated and attached to the contract.</p>
        <p>Document Generated: ${new Date().toLocaleString()}</p>
        <p>Contract ID: ${contract.id}</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Creates a printable signature details page
 * This can be saved as PDF and attached to the contract
 */
export const createSignatureDetailsDocument = (contract, signatureData, signerInfo) => {
  const html = generateSignatureDetailsHTML(contract, signatureData, signerInfo);
  
  // Create a blob from the HTML
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  return {
    html,
    blob,
    url,
    // Method to download as HTML (which can be printed to PDF)
    download: () => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contract.fileName.replace(/\.[^/.]+$/, '')}_SignatureDetails.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    // Method to print (which can save as PDF)
    print: () => {
      const printWindow = window.open(url, '_blank');
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };
};

/**
 * Gets the user's IP address for audit trail
 */
export const getUserIPAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP:', error);
    return 'Unable to capture';
  }
};

/**
 * Example usage in your PlannerContract.jsx:
 * 
 * import { createSignatureDetailsDocument, getUserIPAddress } from './PDFSignatureAttachment';
 * 
 * const sendSignedContract = async (signatureDataParam) => {
 *   // ... existing code ...
 *   
 *   // Get IP address for audit trail
 *   const ipAddress = await getUserIPAddress();
 *   
 *   const signerInfo = {
 *     ipAddress: ipAddress,
 *     userAgent: navigator.userAgent,
 *     signedAt: new Date().toISOString()
 *   };
 *   
 *   // Create signature details document
 *   const signatureDoc = createSignatureDetailsDocument(
 *     selectedContract, 
 *     signatureDataParam,
 *     signerInfo
 *   );
 *   
 *   // Auto-download the signature details as HTML (can be printed to PDF)
 *   signatureDoc.download();
 *   
 *   // Or open print dialog (save as PDF option)
 *   // signatureDoc.print();
 *   
 *   // ... rest of your finalization code ...
 * };
 */