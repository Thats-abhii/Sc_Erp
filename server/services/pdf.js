import PDFDocument from "pdfkit";

export function streamCommercialPdf(res, { type, order }) {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${type}-${order.id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(22).fillColor("#1a3c5e").text("SmartCovering ERP", { align: "left" });
  doc.fontSize(10).fillColor("#444").text("Window Blinds & Mosquito Mesh Manufacturing | India");
  doc.moveDown();
  doc.fontSize(16).fillColor("#f59e0b").text(type === "invoice" ? "Tax Invoice" : "Quotation");
  doc.moveDown();

  doc.fillColor("#111").fontSize(11);
  doc.text(`Order: ${order.id}`);
  doc.text(`Customer: ${order.customer_name}`);
  doc.text(`Mobile: ${order.mobile}`);
  doc.text(`Delivery Date: ${order.delivery_date || "-"}`);
  doc.moveDown();

  doc.fontSize(12).text("Items", { underline: true });
  const items = order.items || [];
  items.forEach((item, index) => {
    doc.fontSize(10).text(`${index + 1}. ${item.name} (${item.size}) x ${item.qty} @ INR ${item.unit_price} = INR ${item.total}`);
  });
  doc.moveDown();
  doc.fontSize(12).text(`Final Amount: INR ${order.final_amount || 0}`);
  doc.text(`Advance Paid: INR ${order.advance_paid || 0}`);
  doc.text(`Balance Due: INR ${order.balance_due || 0}`);
  doc.moveDown();
  doc.fontSize(9).fillColor("#666").text("Terms: 50% advance, balance before installation. Warranty and GST terms as per company policy.");
  doc.end();
}
