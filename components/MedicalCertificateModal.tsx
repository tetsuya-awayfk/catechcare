import React, { useRef } from 'react';
import { X, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Folio landscape: 13in × 8.5in at 96dpi
const CERT_W = 1248; // 13 * 96
const CERT_H = 816;  // 8.5 * 96
const SCALE  = 0.74; // scale down for modal preview

interface CertProps {
  today: string;
  hr: any; bp: any; spo2: any; temp: any;
  fullName: string; age: any; sex: string; civilStatus: string;
}

/** Reusable field: value centred above an underline, label centred below */
const Field: React.FC<{ value?: string; label: string; width?: string | number }> = ({
  value = '', label, width = '100%',
}) => (
  <div style={{ textAlign: 'center', width }}>
    <div style={{
      borderBottom: '1px solid #000',
      minHeight: '24px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: '6px',
      fontWeight: value ? 'bold' : 'normal',
      fontSize: '14px',
    }}>
      {value}&nbsp;
    </div>
    <div style={{ fontSize: '10px', marginTop: '2px' }}>{label}</div>
  </div>
);

/** One certificate copy (~half the folio width) */
const CertCopy: React.FC<CertProps> = ({
  today, hr, bp, spo2, temp, fullName, age, sex, civilStatus,
}) => (
  <div style={{
    width: '620px',
    minHeight: `${CERT_H}px`,
    padding: '28px 36px 24px',
    fontFamily: 'Times New Roman, Times, serif',
    color: '#000',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  }}>
    {/* ── Header ────────────────────────────────── */}
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
      <tbody>
        <tr>
          <td style={{ width: '72px', verticalAlign: 'middle', paddingRight: '12px' }}>
            <img src="/catc-logo.png" alt="CATC" style={{ width: '64px', height: '64px', objectFit: 'contain', display: 'block' }} />
          </td>
          <td style={{ verticalAlign: 'top' }}>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#1a3aaf', lineHeight: 1.2 }}>
              COMPUTER ARTS AND TECHNOLOGICAL COLLEGE, Inc.
            </div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '3px', lineHeight: 1.5 }}>
              Balintawak Street, Albay District, Legazpi City 4500 Philippines
            </div>
            <div style={{ fontSize: '10px', color: '#555', lineHeight: 1.5 }}>
              CP No.: 09208705327 – CATC Main / CP No. 09816636651 – Extension / E-mail: catcollege_registrar@yahoo.com
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <hr style={{ borderTop: '2px solid #1a3aaf', margin: '7px 0 20px' }} />

    {/* ── Title ─────────────────────────────────── */}
    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', letterSpacing: '1px', marginBottom: '20px' }}>
      MEDICAL CERTIFICATE
    </div>

    {/* ── Date (right-aligned, value on underline) ─ */}
    <div style={{ textAlign: 'right', marginBottom: '22px', fontSize: '12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '6px' }}>
      <span>DATE:</span>
      <div style={{
        borderBottom: '1px solid #000',
        minWidth: '120px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '13px',
        paddingBottom: '6px',
      }}>
        {today}
      </div>
    </div>

    {/* ── To Whom ───────────────────────────────── */}
    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '14px' }}>
      TO WHOM IT MAY CONCERN,
    </div>

    {/* ── Name ─────────────────────────────────── */}
    <div style={{ fontSize: '12px', marginBottom: '2px' }}>This certifies that</div>
    <div style={{
      borderBottom: '1px solid #000',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
      paddingBottom: '8px',
      marginBottom: '2px',
    }}>
      {fullName}
    </div>
    <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '16px' }}>(NAME)</div>

    {/* ── Age / Sex / Civil Status ──────────────── */}
    <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
      <Field value={age !== '--' ? String(age) : ''} label="Age"           width="31%" />
      <Field value={sex !== '--'        ? sex         : ''} label="Male/Female"   width="36%" />
      <Field value={civilStatus !== '--' ? civilStatus  : ''} label="Single/Married" width="33%" />
    </div>

    {/* ── Residing at (blank) ───────────────────── */}
    <div style={{ fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
      <span style={{ whiteSpace: 'nowrap' }}>and presently residing at</span>
      <div style={{ flex: 1, borderBottom: '1px solid #000', minHeight: '16px' }} />
    </div>

    {/* ── Examined on (auto-filled) ─────────────── */}
    <div style={{ fontSize: '12px', marginBottom: '20px', display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
      <span style={{ whiteSpace: 'nowrap' }}>was seen and examined on</span>
      <div style={{
        borderBottom: '1px solid #000',
        minWidth: '150px',
        fontWeight: 'bold',
        textAlign: 'center',
        paddingBottom: '6px',
        fontSize: '13px',
      }}>{today}</div>
      <span style={{ whiteSpace: 'nowrap' }}>and with the following</span>
    </div>

    {/* ── Remarks (blank lines) ─────────────────── */}
    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
      REMARKS/RECOMMENDATIONS:
    </div>
    <div style={{ borderBottom: '1px solid #000', marginBottom: '8px', height: '18px' }} />
    <div style={{ borderBottom: '1px solid #000', marginBottom: '24px', height: '18px' }} />

    {/* ── Vitals (values centred above underline) ── */}
    <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '6px' }}>
      {[
        { label: 'HR:',   value: hr   !== '--'    ? `${hr} BPM`  : '' },
        { label: 'BP:',   value: bp   !== '--/--' ? `${bp} mmHg` : '' },
        { label: 'SpO2:', value: spo2 !== '--'    ? `${spo2}%`   : '' },
        { label: 'Temp:', value: temp !== '--'    ? `${temp}°C`  : '' },
      ].map(v => (
        <div key={v.label} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ minWidth: '42px' }}>{v.label}</span>
          <div style={{
            borderBottom: '1px solid #000',
            minWidth: '80px',
            textAlign: 'center',
            fontWeight: v.value ? 'bold' : 'normal',
            paddingBottom: '6px',
            fontSize: '12px',
          }}>
            {v.value || '\u00A0'}
          </div>
        </div>
      ))}
    </div>

    {/* ── Signature ─────────────────────────────── */}
    <div style={{ marginTop: '28px', textAlign: 'right', fontSize: '15px', lineHeight: 1.85 }}>
      <div style={{ fontWeight: 'bold' }}>ANNA RAE B. MAYOR, MD</div>
      <div>License Number: 106031</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '4px' }}>
        <span>PTR No.</span>
        <div style={{ borderBottom: '1px solid #000', minWidth: '120px', height: '16px' }} />
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════ */

interface Props { patient: any; onClose: () => void; }

const MedicalCertificateModal: React.FC<Props> = ({ patient, onClose }) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = React.useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const hr          = patient.vitals?.hr   ?? '--';
  const bp          = patient.vitals?.bp   ?? '--/--';
  const spo2        = patient.vitals?.spo2 ?? '--';
  const temp        = patient.vitals?.temp ?? '--';
  const fullName    = patient.firstName || `${patient.last_name}, ${patient.rawFirstName}`;
  const age         = patient.age ?? '--';
  const sex         = patient.sex
    ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1).toLowerCase()
    : '--';
  const civilStatus = patient.civil_status
    ? patient.civil_status.charAt(0).toUpperCase() + patient.civil_status.slice(1).toLowerCase()
    : '--';

  const certProps: CertProps = { today: dateStr, hr, bp, spo2, temp, fullName, age, sex, civilStatus };

  const handleDownload = async () => {
    if (!certRef.current) return;
    // Capture the FULL-size hidden div (no transform)
    const canvas = await html2canvas(certRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: CERT_W,
      height: CERT_H,
    });
    const imgData = canvas.toDataURL('image/png');
    // jsPDF: folio landscape = 13in wide × 8.5in tall
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [8.5, 13] });
    pdf.addImage(imgData, 'PNG', 0, 0, 13, 8.5);
    pdf.save(`MedCert_${(patient.last_name || 'Patient').toUpperCase()}_${today.toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = async () => {
    if (!certRef.current) return;
    setIsPrinting(true);
    
    try {
      // Capture canvas
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: CERT_W,
        height: CERT_H,
      });
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [8.5, 13] });
      pdf.addImage(imgData, 'PNG', 0, 0, 13, 8.5);
      
      // Auto print ensures native browser print dialog opens in Chrome/Edge, fallback to view in Safari/Firefox
      pdf.autoPrint();
      const pdfBlobUrl = pdf.output('bloburl') as any;
      window.open(pdfBlobUrl.toString(), '_blank');
    } catch (error) {
      console.error('Failed to generate PDF for printing:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  // Certificate content (shared between hidden capture div and visible preview)
  const CertContent = () => (
    <div style={{ width: `${CERT_W}px`, height: `${CERT_H}px`, background: '#fff', display: 'flex', flexDirection: 'row' }}>
      <CertCopy {...certProps} />
      {/* Centre divider */}
      <div style={{ width: '1px', background: '#bbb', flexShrink: 0, margin: '24px 0' }} />
      <CertCopy {...certProps} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95">

        {/* Modal header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black text-[#022FFC] uppercase tracking-widest">Medical Certificate — Folio Landscape</p>
            <h3 className="text-lg font-black dark:text-white tracking-tight">{fullName}</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#022FFC] border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-teal-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all active:scale-95"
            >
              <Download size={16} /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#022FFC] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPrinting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Printer size={16} /> Print Med Cert
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all text-gray-400"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable scaled preview ── */}
        <div className="flex-1 overflow-auto p-5 bg-gray-200 dark:bg-zinc-950 flex justify-center">
          {/* Scaled display wrapper */}
          <div style={{
            width:  `${Math.round(CERT_W * SCALE)}px`,
            height: `${Math.round(CERT_H * SCALE)}px`,
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              width:  `${CERT_W}px`,
              height: `${CERT_H}px`,
              transform: `scale(${SCALE})`,
              transformOrigin: 'top left',
            }}>
              <CertContent />
            </div>
          </div>
        </div>

        {/* ── Hidden full-size div for html2canvas capture ── */}
        <div
          ref={certRef}
          style={{ position: 'fixed', left: '-9999px', top: 0, width: `${CERT_W}px`, height: `${CERT_H}px`, zIndex: -1 }}
          aria-hidden="true"
        >
          <CertContent />
        </div>
      </div>
    </div>
  );
};

export default MedicalCertificateModal;
