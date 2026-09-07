import PDFDocument from 'pdfkit';
import Trainee from '../models/Trainee.js';
import { attPct, band, getCheckpoint, logAvg, podNumber, velocity } from '../services/traineeStats.js';

const COLS = [
  { key: 'name', label: 'Trainee', width: 140 },
  { key: 'pod', label: 'Pod', width: 40 },
  { key: 'band', label: 'Band', width: 45 },
  { key: 'checkpoint', label: 'Checkpoint', width: 65 },
  { key: 'velocity', label: 'Velocity', width: 55 },
  { key: 'log_avg', label: 'Log avg', width: 55 },
  { key: 'att_pct', label: 'Attend', width: 55 },
];

function fmt(v, suffix = '') {
  return v == null ? '—' : `${v}${suffix}`;
}

// Streams a PDF straight to res — no temp file, no headless browser (SPEC.md §7 v1:
// "the monthly pack as a generated PDF"). Aggregates whatever data exists for the
// batch; there's no date filtering yet since we only track one rolling window of days.
export async function writeMonthlyPack(res, { batchId, batch, month }) {
  const trainees = await Trainee.find({ batch: batch._id }).populate('person').populate('pod').lean();

  const rows = await Promise.all(trainees.map(async (t) => {
    const assessment = await getCheckpoint(t._id);
    const chk = assessment?.total ?? null;
    return {
      name: t.person.name,
      pod: `P${podNumber(t.pod)}`,
      band: band(t.baselineScore, chk) ?? 'pending',
      checkpoint: chk,
      velocity: velocity(t.baselineScore, chk),
      log_avg: await logAvg(t._id).then((v) => (v != null ? v.toFixed(2) : null)),
      att_pct: await attPct(t._id).then((v) => (v != null ? Math.round(v * 100) : null)),
    };
  }));

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="neoteric-excellence-monthly-pack-${month}.pdf"`);
  doc.pipe(res);

  doc.fontSize(18).text('Neoteric Excellence — Monthly Pack', { align: 'left' });
  doc.fontSize(10).fillColor('#555')
    .text(`Batch ${batchId} · ${month} · generated ${new Date().toISOString().slice(0, 10)}`);
  doc.moveDown(1.2);

  const counts = { A: 0, B: 0, C: 0, D: 0, pending: 0 };
  rows.forEach((r) => { counts[r.band] = (counts[r.band] ?? 0) + 1; });

  doc.fillColor('#000').fontSize(13).text('Band distribution', { underline: true });
  doc.fontSize(10).fillColor('#333')
    .text(`A ${counts.A} · B ${counts.B} · C ${counts.C} · D ${counts.D} · pending checkpoint ${counts.pending}`);
  doc.moveDown(1);

  const dBand = rows.filter((r) => r.band === 'D');
  if (dBand.length) {
    doc.fillColor('#000').fontSize(13).text('Needs attention', { underline: true });
    doc.fontSize(10).fillColor('#a00')
      .text(`Band D: ${dBand.map((r) => r.name).join(', ')} — written conversation with Deepti, not an exit.`);
    doc.moveDown(1);
  }

  doc.fillColor('#000').fontSize(13).text('Trainees', { underline: true });
  doc.moveDown(0.4);

  const startX = doc.x;
  let y = doc.y;
  doc.fontSize(9).fillColor('#000');
  let x = startX;
  COLS.forEach((c) => { doc.text(c.label, x, y, { width: c.width, continued: false }); x += c.width; });
  y += 14;
  doc.moveTo(startX, y).lineTo(x, y).strokeColor('#ccc').stroke();
  y += 6;

  doc.fontSize(9).fillColor('#333');
  rows.forEach((r) => {
    if (y > 760) { doc.addPage(); y = 50; }
    x = startX;
    doc.text(r.name, x, y, { width: COLS[0].width }); x += COLS[0].width;
    doc.text(r.pod, x, y, { width: COLS[1].width }); x += COLS[1].width;
    doc.text(r.band, x, y, { width: COLS[2].width }); x += COLS[2].width;
    doc.text(fmt(r.checkpoint), x, y, { width: COLS[3].width }); x += COLS[3].width;
    doc.text(fmt(r.velocity), x, y, { width: COLS[4].width }); x += COLS[4].width;
    doc.text(fmt(r.log_avg), x, y, { width: COLS[5].width }); x += COLS[5].width;
    doc.text(fmt(r.att_pct, '%'), x, y, { width: COLS[6].width });
    y += 16;
  });

  doc.end();
}
