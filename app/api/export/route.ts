import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportShot = {
  no: number;
  image?: string;
  shotSize?: string;
  duration?: number;
  description?: string;
  note?: string;
  scene?: string;
  status?: string;
  sellingPoint?: string;
  props?: string;
  customFields?: Record<string, string>;
};

type ExportProject = {
  name: string;
  client?: string;
  format?: string;
  dueDate?: string;
  shots: ExportShot[];
  notices?: Array<{
    title: string; date: string; firstRoll?: string; location?: string;
    weather?: string; note?: string;
  }>;
};

const yellow = "#FFD86B";
const line = "#777777";
const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSansSC-Regular.otf");

function authorized(request: NextRequest) {
  const expected = process.env.ACCESS_KEY || "wangwenzhi";
  const given = request.headers.get("x-access-key") || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").slice(0, 80) || "分镜";
}

function totalDuration(project: ExportProject) {
  return project.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
}

function fitAspect(maxWidth: number, maxHeight: number, ratio: number) {
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width, height };
}

async function imageBuffer(source?: string) {
  if (!source) return null;
  try {
    let original: Buffer | null = null;
    if (source.startsWith("data:")) {
      if (source.startsWith("data:image/svg")) return null;
      const comma = source.indexOf(",");
      original = comma >= 0 ? Buffer.from(source.slice(comma + 1), "base64") : null;
    } else {
      const response = await fetch(source, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return null;
      const type = response.headers.get("content-type") || "";
      if (!type.startsWith("image/")) return null;
      const bytes = await response.arrayBuffer();
      original = bytes.byteLength <= 8_000_000 ? Buffer.from(bytes) : null;
    }
    if (!original) return null;
    return await sharp(original)
      .rotate()
      .resize(1600, 900, { fit: "cover", position: "centre" })
      .flatten({ background: "#f2f4f4" })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    return null;
  }
}

function drawCell(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { align?: "left" | "center" | "right"; size?: number; bold?: boolean; color?: string; padding?: number } = {},
) {
  doc.font(fontPath).fontSize(options.size || 11).fillColor(options.color || "#000000");
  const pad = options.padding !== undefined ? options.padding : 6;
  const textOptions = {
    width: Math.max(0, width - pad * 2),
    height: Math.max(0, height - pad * 2),
    align: options.align || "center",
    ellipsis: true,
    lineGap: 3,
  } as PDFKit.Mixins.TextOptions;
  const textHeight = Math.min(height - pad * 2, doc.heightOfString(text || "", textOptions));
  doc.text(text || "", x + pad, y + Math.max(pad, (height - textHeight) / 2), textOptions);
}

type ExportOptions = {
  fontSize?: string;
  maxColumns?: number;
  brandLogo?: string;
  headerColor?: string;
};

async function makePdf(project: ExportProject, exportType = "分镜", options?: ExportOptions) {
  if (exportType !== "分镜") return makeVisualPdf(project, exportType);
  const doc = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    font: fontPath,
    size: "A4",
    layout: "landscape",
    margins: { top: 20, right: 28, bottom: 20, left: 28 },
    info: { Title: `${project.name} - 分镜`, Author: "MediaStory" },
  } as PDFKit.PDFDocumentOptions & { font: string });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const fontScale = options?.fontSize === "大" ? 1.2 : options?.fontSize === "小" ? 0.95 : 1.08;
  const isEightCols = options?.maxColumns === 8;
  const images = await Promise.all(project.shots.map((shot) => imageBuffer(shot.image)));
  const projectRatio = 16 / 9;

  // 7 or 8 columns layout: 镜号, 画面, 景别, 时长 (秒), 内容, 备注, 卖点, [道具]
  const columns = isEightCols
    ? [40, 125, 50, 50, 225, 136, 80, 80]
    : [42, 130, 52, 52, 250, 150, 110];
  const headers = isEightCols
    ? ["镜号", "画面", "景别", "时长 (秒)", "内容", "备注", "卖点", "道具"]
    : ["镜号", "画面", "景别", "时长 (秒)", "内容", "备注", "卖点"];

  const left = 28;
  const tableWidth = columns.reduce((sum, width) => sum + width, 0);
  const tableTop = 74;
  const headerHeight = 28;
  const rowHeight = 74;
  const rowsPerPage = 6;
  const brandName = options?.brandLogo || project.client || "ulefone";
  const headerBg = options?.headerColor || "#000000";

  function pageHeader() {
    doc.addPage();
    // Project Name on top-left (bold black, larger)
    doc.font(fontPath).fillColor("#111111").fontSize(19).text(project.name, left, 22, { lineGap: 0 });
    
    // Brand / Client Logo on top-right (yellow/orange italic)
    doc.fillColor("#F3A600").fontSize(19).text(brandName, 550, 19, {
      width: 264,
      align: "right",
    });
    
    // Meta info on top-right below brand logo
    doc.fillColor("#555555").fontSize(8.5).text(
      `画幅比 ${project.format || "16:9"}  |  总镜头数 ${project.shots.length}个  |  总时长 ${totalDuration(project)}秒`,
      500,
      50,
      { width: 314, align: "right" },
    );

    // Header background (pure black by default)
    doc.rect(left, tableTop, tableWidth, headerHeight).fill(headerBg);
    let x = left;
    headers.forEach((header, index) => {
      drawCell(doc, header, x, tableTop, columns[index], headerHeight, {
        size: Math.round(10.5 * fontScale),
        color: "#FFFFFF",
        align: "center",
      });
      x += columns[index];
    });
  }

  function footer(pageNumber: number) {
    // Brand on bottom-left
    doc.font(fontPath).fillColor("#F3A600").fontSize(9).text(brandName, left, 554);
    // Project Name · 分镜 · Page on bottom-right
    doc.fillColor("#555555").fontSize(8).text(
      `${project.name} · 分镜 · ${pageNumber}`,
      610,
      554,
      { width: 204, align: "right" },
    );
  }

  pageHeader();
  let y = tableTop + headerHeight;
  let countOnCurrentPage = 0;

  project.shots.forEach((shot, index) => {
    if (countOnCurrentPage >= rowsPerPage) {
      footer(doc.bufferedPageRange().count);
      pageHeader();
      y = tableTop + headerHeight;
      countOnCurrentPage = 0;
    }

    let x = left;
    const sellingPoint = shot.sellingPoint || shot.customFields?.["卖点"] || shot.customFields?.["sellingPoint"] || "";
    const props = shot.props || shot.customFields?.["道具"] || shot.customFields?.["props"] || "";
    
    const values = isEightCols
      ? [
          String(shot.no),
          "",
          shot.shotSize || "",
          shot.duration ? String(shot.duration) : "",
          shot.description || "",
          shot.note || "",
          sellingPoint,
          props,
        ]
      : [
          String(shot.no),
          "",
          shot.shotSize || "",
          shot.duration ? String(shot.duration) : "",
          shot.description || "",
          shot.note || "",
          sellingPoint,
        ];

    values.forEach((value, columnIndex) => {
      // Crisp gray border
      doc.rect(x, y, columns[columnIndex], rowHeight).lineWidth(0.6).strokeColor("#B0B5B9").stroke();
      if (columnIndex !== 1) {
        // Content column is index 4, note is index 5
        const isLeft = columnIndex === 4 || columnIndex === 5;
        let fontSize = Math.round(10 * fontScale);
        if (columnIndex === 0) fontSize = Math.round(11.5 * fontScale);
        if (columnIndex === 4) fontSize = Math.round(10.5 * fontScale);
        if (columnIndex === 5) fontSize = Math.round(9.5 * fontScale);

        drawCell(doc, value, x, y, columns[columnIndex], rowHeight, {
          align: isLeft ? "left" : "center",
          size: fontSize,
          color: columnIndex === 5 ? "#262626" : "#000000",
          padding: isLeft ? 6 : 3,
        });
      }
      x += columns[columnIndex];
    });

    const image = images[index];
    if (image) {
      try {
        const box = fitAspect(columns[1] - 10, rowHeight - 10, projectRatio);
        doc.image(image, left + columns[0] + (columns[1] - box.width) / 2, y + (rowHeight - box.height) / 2, {
          cover: [box.width, box.height],
          align: "center",
          valign: "center",
        });
      } catch {
        drawCell(doc, "图片无法加载", left + columns[0], y, columns[1], rowHeight, { size: 9, color: "#888888" });
      }
    } else {
      doc.rect(left + columns[0] + 5, y + 5, columns[1] - 10, rowHeight - 10).fill("#F3F4F5");
      drawCell(doc, "未添加图片", left + columns[0], y, columns[1], rowHeight, { size: 9, color: "#999999" });
    }

    y += rowHeight;
    countOnCurrentPage++;
  });

  footer(doc.bufferedPageRange().count);
  doc.end();
  return done;
}

async function makeExcel(project: ExportProject, exportType = "分镜", options?: ExportOptions) {
  if (exportType !== "分镜") return makeVisualExcel(project, exportType);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MediaStory";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("分镜", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
      printTitlesRow: "1:4",
    },
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  });

  const isEightCols = options?.maxColumns === 8;
  const brandName = options?.brandLogo || project.client || "ulefone";

  sheet.columns = isEightCols
    ? [
        { key: "no", width: 8 },
        { key: "image", width: 22 },
        { key: "shotSize", width: 10 },
        { key: "duration", width: 12 },
        { key: "description", width: 38 },
        { key: "note", width: 28 },
        { key: "sellingPoint", width: 16 },
        { key: "props", width: 16 },
      ]
    : [
        { key: "no", width: 8 },
        { key: "image", width: 22 },
        { key: "shotSize", width: 10 },
        { key: "duration", width: 12 },
        { key: "description", width: 42 },
        { key: "note", width: 30 },
        { key: "sellingPoint", width: 20 },
      ];

  const lastColLetter = isEightCols ? "H" : "G";
  sheet.mergeCells("A1:C2");
  sheet.getCell("A1").value = project.name;
  sheet.getCell("A1").font = { name: "Noto Sans SC", size: 21, bold: true, color: { argb: "FF111111" } };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  sheet.mergeCells(`${isEightCols ? "G1:H1" : "F1:G1"}`);
  sheet.getCell(`${isEightCols ? "G1" : "F1"}`).value = brandName;
  sheet.getCell(`${isEightCols ? "G1" : "F1"}`).font = { name: "Noto Sans SC", size: 21, bold: true, italic: true, color: { argb: "FFF3A600" } };
  sheet.getCell(`${isEightCols ? "G1" : "F1"}`).alignment = { vertical: "middle", horizontal: "right" };
  sheet.mergeCells(`${isEightCols ? "F2:H2" : "E2:G2"}`);
  sheet.getCell(`${isEightCols ? "F2" : "E2"}`).value =
    `画幅比  ${project.format || "16:9"}   |   总镜头数 ${project.shots.length}个   |   总时长 ${totalDuration(project)}秒`;
  sheet.getCell(`${isEightCols ? "F2" : "E2"}`).font = { name: "Noto Sans SC", size: 10, color: { argb: "FF555555" } };
  sheet.getCell(`${isEightCols ? "F2" : "E2"}`).alignment = { vertical: "middle", horizontal: "right" };
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 10;

  const header = sheet.getRow(4);
  header.values = isEightCols
    ? ["镜号", "画面", "景别", "时长 (秒)", "内容", "备注", "卖点", "道具"]
    : ["镜号", "画面", "景别", "时长 (秒)", "内容", "备注", "卖点"];
  header.height = 28;
  const headerHex = (options?.headerColor || "#000000").replace("#", "").toUpperCase();
  const headerArgb = headerHex.length === 6 ? `FF${headerHex}` : "FF000000";
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerArgb } };
    cell.font = { name: "Noto Sans SC", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: headerArgb } },
    };
  });

  const images = await Promise.all(project.shots.map((shot) => imageBuffer(shot.image)));
  const projectRatio = 16 / 9;
  project.shots.forEach((shot, index) => {
    const rowNumber = index + 5;
    const row = sheet.getRow(rowNumber);
    const sellingPoint = shot.sellingPoint || shot.customFields?.["卖点"] || shot.customFields?.["sellingPoint"] || "";
    const props = shot.props || shot.customFields?.["道具"] || shot.customFields?.["props"] || "";
    row.values = isEightCols
      ? [
          shot.no,
          "",
          shot.shotSize || "",
          shot.duration ? Number(shot.duration) : "",
          shot.description || "",
          shot.note || "",
          sellingPoint,
          props,
        ]
      : [
          shot.no,
          "",
          shot.shotSize || "",
          shot.duration ? Number(shot.duration) : "",
          shot.description || "",
          shot.note || "",
          sellingPoint,
        ];
    row.height = 76;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const isLeft = columnNumber === 5 || columnNumber === 6;
      cell.font = { name: "Noto Sans SC", size: isLeft ? 10.5 : 11, bold: isLeft, color: { argb: "FF000000" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: isLeft ? "left" : "center",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFB0B5B9" } },
        left: { style: "thin", color: { argb: "FFB0B5B9" } },
        bottom: { style: "thin", color: { argb: "FFB0B5B9" } },
        right: { style: "thin", color: { argb: "FFB0B5B9" } },
      };
    });
    const image = images[index];
    if (image) {
      const imageId = workbook.addImage({ buffer: image as unknown as ExcelJS.Buffer, extension: "jpeg" });
      const box = fitAspect(150, 88, projectRatio);
      sheet.addImage(imageId, {
        tl: { col: 1.08 + (150 - box.width) / 150 / 2, row: rowNumber - 0.92 + (88 - box.height) / 88 / 2 },
        ext: { width: box.width, height: box.height },
        editAs: "oneCell",
      });
    } else {
      sheet.getCell(rowNumber, 2).value = "未添加图片";
      sheet.getCell(rowNumber, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F5" } };
      sheet.getCell(rowNumber, 2).font = { name: "Noto Sans SC", size: 10, color: { argb: "FF999999" } };
    }
    if ((index + 1) % 6 === 0 && index < project.shots.length - 1) row.addPageBreak();
  });

  sheet.autoFilter = { from: "A4", to: `${lastColLetter}${Math.max(4, project.shots.length + 4)}` };
  sheet.headerFooter.oddFooter =
    `&L&KFFC400${brandName}&R${project.name} · 分镜 · &P / &N`;
  sheet.pageSetup.printArea = `A1:${lastColLetter}${Math.max(4, project.shots.length + 4)}`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function makeVisualPdf(project: ExportProject, exportType: string) {
  const doc = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    font: fontPath,
    size: "A4",
    layout: "landscape",
    margins: { top: 24, right: 28, bottom: 24, left: 28 },
    info: { Title: `${project.name} - ${exportType}`, Author: "MediaStory" },
  } as PDFKit.PDFDocumentOptions & { font: string });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const images = await Promise.all(project.shots.map((shot) => imageBuffer(shot.image)));
  const projectRatio = 16 / 9;
  let pageNo = 0;
  const page = () => {
    doc.addPage();
    pageNo += 1;
    doc.font(fontPath).fillColor("#111").fontSize(18).text(project.name, 28, 27);
    doc.fillColor("#FFCA18").fontSize(19).text(project.client || "MediaStory", 610, 25, { width: 204, align: "right" });
    doc.fillColor("#252525").fontSize(7.5).text(
      `画幅比 ${project.format || "16:9"}   |   总镜头数 ${project.shots.length}个   |   总时长 ${totalDuration(project)}秒`,
      500, 62, { width: 314, align: "right" },
    );
  };
  const footer = () => {
    doc.font(fontPath).fillColor("#FFCA18").fontSize(8).text(project.client || "MediaStory", 28, 555);
    doc.fillColor("#222").fontSize(7).text(`${project.name} · ${exportType} · ${pageNo}`, 610, 555, { width: 204, align: "right" });
  };

  page();
  if (exportType === "故事板") {
    const cardWidth = 148;
    const cardHeight = 205;
    project.shots.forEach((shot, index) => {
      if (index > 0 && index % 10 === 0) { footer(); page(); }
      const local = index % 10;
      const col = local % 5;
      const row = Math.floor(local / 5);
      const x = 28 + col * 157;
      const y = 96 + row * 218;
      doc.roundedRect(x, y, cardWidth, cardHeight, 7).lineWidth(0.5).strokeColor("#D5D9DB").stroke();
      if (images[index]) {
        try {
          const box = fitAspect(136, 77, projectRatio);
          doc.image(images[index]!, x + 6 + (136 - box.width) / 2, y + 6 + (77 - box.height) / 2, {
            cover: [box.width, box.height], align: "center", valign: "center",
          });
        } catch {}
      } else doc.rect(x + 6, y + 6, 136, 77).fill("#F0F2F3");
      doc.font(fontPath).fillColor("#6F767A").fontSize(7).text(`${shot.shotSize || "未设置"}   ${shot.duration || 0}秒`, x + 7, y + 92, { width: 134 });
      doc.fillColor("#202427").fontSize(7.5).text(shot.description || "暂无内容", x + 7, y + 113, { width: 134, height: 52, ellipsis: true });
      doc.fillColor("#90969A").fontSize(7).text(`镜头 ${shot.no}`, x + 7, y + 184);
    });
  } else if (exportType === "拍摄计划") {
    const groups = new Map<string, Array<{ shot: ExportShot; image: Buffer | null }>>();
    project.shots.forEach((shot, index) => {
      const scene = shot.scene || "未规划镜头";
      groups.set(scene, [...(groups.get(scene) || []), { shot, image: images[index] }]);
    });
    const entries = [...groups.entries()].flatMap(([scene, items]) =>
      Array.from({ length: Math.max(1, Math.ceil(items.length / 5)) }, (_, index) => [
        `${scene}${index ? "（续）" : ""}`,
        items.slice(index * 5, index * 5 + 5),
      ] as [string, Array<{ shot: ExportShot; image: Buffer | null }>]),
    );
    entries.forEach(([scene, items], groupIndex) => {
      if (groupIndex > 0 && groupIndex % 3 === 0) { footer(); page(); }
      const col = groupIndex % 3;
      const x = 28 + col * 263;
      const y = 96;
      doc.roundedRect(x, y, 252, 34, 5).fill(yellow);
      doc.font(fontPath).fillColor("#202427").fontSize(10).text(scene, x + 9, y + 9, { width: 140 });
      doc.fontSize(6.5).text(`${project.dueDate || "待定"} · ${items.length}镜`, x + 150, y + 11, { width: 92, align: "right" });
      let itemY = y + 34;
      items.forEach(({ shot, image }) => {
        doc.rect(x, itemY, 252, 78).lineWidth(0.5).strokeColor("#CDD2D4").stroke();
        if (image) {
          try {
            const box = fitAspect(66, 64, projectRatio);
            doc.image(image, x + 35 + (66 - box.width) / 2, itemY + 7 + (64 - box.height) / 2, {
              cover: [box.width, box.height], align: "center", valign: "center",
            });
          } catch {}
        } else doc.rect(x + 35, itemY + 7, 66, 64).fill("#F0F2F3");
        doc.font(fontPath).fillColor("#23282B").fontSize(7).text(`镜头 ${shot.no}`, x + 4, itemY + 31, { width: 28, align: "center" });
        doc.fontSize(6.5).text(shot.description || "暂无内容", x + 106, itemY + 10, { width: 100, height: 48, ellipsis: true });
        doc.fillColor("#777D80").fontSize(6).text(shot.shotSize || "未设置", x + 207, itemY + 20, { width: 40, align: "center" });
        doc.text(`${shot.duration || 0}秒`, x + 207, itemY + 42, { width: 40, align: "center" });
        itemY += 78;
      });
    });
  } else {
    const notices = project.notices || [];
    if (!notices.length) drawCell(doc, "暂无拍摄通告", 38, 200, 1124, 200, { size: 18 });
    notices.forEach((notice, index) => {
      const y = 100 + index * 220;
      doc.rect(28, y, 786, 195).lineWidth(0.7).strokeColor("#AEB4B7").stroke();
      doc.font(fontPath).fillColor("#222").fontSize(14).text(notice.title, 43, y + 15);
      const info = [
        ["拍摄日期", notice.date], ["第一镜时间", notice.firstRoll || "待定"],
        ["拍摄地点", notice.location || "待定"], ["天气", notice.weather || "待定"],
      ];
      info.forEach(([label, value], i) => {
        const x = 43 + (i % 2) * 380;
        const iy = y + 55 + Math.floor(i / 2) * 42;
        doc.fontSize(8).fillColor("#777").text(label, x, iy);
        doc.fillColor("#222").text(value, x + 70, iy, { width: 285 });
      });
      doc.fillColor("#555").fontSize(7.5).text(notice.note || "", 43, y + 158, { width: 755 });
    });
  }
  footer();
  doc.end();
  return done;
}

async function makeVisualExcel(project: ExportProject, exportType: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MediaStory";
  const sheet = workbook.addWorksheet(exportType, {
    pageSetup: {
      orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9,
      margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
      printTitlesRow: "1:2",
    },
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  });
  sheet.mergeCells("A1:C2");
  sheet.getCell("A1").value = project.name;
  sheet.getCell("A1").font = { name: "Noto Sans SC", size: 22, bold: true };
  sheet.mergeCells("F1:H1");
  sheet.getCell("F1").value = project.client || "MediaStory";
  sheet.getCell("F1").font = { name: "Noto Sans SC", size: 22, bold: true, italic: true, color: { argb: "FFFFC400" } };
  sheet.getCell("F1").alignment = { horizontal: "right" };
  sheet.mergeCells("E2:H2");
  sheet.getCell("E2").value = `画幅比 ${project.format || "16:9"} | 总镜头数 ${project.shots.length}个 | 总时长 ${totalDuration(project)}秒`;
  sheet.getCell("E2").alignment = { horizontal: "right" };
  const images = await Promise.all(project.shots.map((shot) => imageBuffer(shot.image)));
  const projectRatio = 16 / 9;

  if (exportType === "拍摄计划") {
    sheet.columns = [
      { width: 17 }, { width: 28 }, { width: 14 },
      { width: 17 }, { width: 28 }, { width: 14 },
      { width: 17 }, { width: 28 }, { width: 14 },
    ];
    const groups = new Map<string, Array<{ shot: ExportShot; image: Buffer | null }>>();
    project.shots.forEach((shot, index) => {
      const scene = shot.scene || "未规划镜头";
      groups.set(scene, [...(groups.get(scene) || []), { shot, image: images[index] }]);
    });
    const blocks = [...groups.entries()].flatMap(([scene, items]) =>
      Array.from({ length: Math.max(1, Math.ceil(items.length / 5)) }, (_, index) => ({
        scene: `${scene}${index ? "（续）" : ""}`,
        items: items.slice(index * 5, index * 5 + 5),
      })),
    );
    const pages = Array.from({ length: Math.max(1, Math.ceil(blocks.length / 3)) }, (_, index) =>
      blocks.slice(index * 3, index * 3 + 3),
    );
    pages.forEach((pageBlocks, pageIndex) => {
      const startRow = 4 + pageIndex * 7;
      pageBlocks.forEach((block, blockIndex) => {
        const startCol = 1 + blockIndex * 3;
        sheet.mergeCells(startRow, startCol, startRow, startCol + 2);
        const headerCell = sheet.getCell(startRow, startCol);
        headerCell.value = `${block.scene}　${project.dueDate || "待定"}　${block.items.length}镜`;
        headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFD86B" } };
        headerCell.font = { name: "Noto Sans SC", bold: true, color: { argb: "FF7B5B18" } };
        block.items.forEach(({ shot, image }, itemIndex) => {
          const rowNo = startRow + itemIndex + 1;
          const row = sheet.getRow(rowNo);
          row.height = 70;
          sheet.getCell(rowNo, startCol).value = "";
          sheet.getCell(rowNo, startCol + 1).value = `镜头 ${shot.no}\n${shot.description || "暂无内容"}`;
          sheet.getCell(rowNo, startCol + 2).value = `${shot.shotSize || "未设置"}\n${shot.duration || 0}秒\n${shot.status || "待拍摄"}`;
          if (image) {
            const imageId = workbook.addImage({ buffer: image as unknown as ExcelJS.Buffer, extension: "jpeg" });
            const box = fitAspect(105, 78, projectRatio);
            sheet.addImage(imageId, {
              tl: { col: startCol - 0.92 + (105 - box.width) / 105 / 2, row: rowNo - 0.92 + (78 - box.height) / 78 / 2 },
              ext: { width: box.width, height: box.height }, editAs: "oneCell",
            });
          }
        });
      });
      if (pageIndex < pages.length - 1) sheet.getRow(startRow + 5).addPageBreak();
    });
  } else if (exportType === "故事板") {
    sheet.columns = Array.from({ length: 5 }, () => ({ width: 28 }));
    project.shots.forEach((shot, index) => {
      const col = (index % 5) + 1;
      const block = Math.floor(index / 5);
      const imageRow = 4 + block * 4;
      sheet.getRow(imageRow).height = 92;
      sheet.getRow(imageRow + 1).height = 24;
      sheet.getRow(imageRow + 2).height = 42;
      sheet.getCell(imageRow + 1, col).value = `${shot.shotSize || "未设置"} · ${shot.duration || 0}秒`;
      sheet.getCell(imageRow + 2, col).value = shot.description || "暂无内容";
      sheet.getCell(imageRow + 3, col).value = `镜头 ${shot.no}`;
      if (images[index]) {
        const imageId = workbook.addImage({ buffer: images[index] as unknown as ExcelJS.Buffer, extension: "jpeg" });
        const box = fitAspect(188, 105, projectRatio);
        sheet.addImage(imageId, {
          tl: { col: col - 0.92 + (188 - box.width) / 188 / 2, row: imageRow - 0.92 + (105 - box.height) / 105 / 2 },
          ext: { width: box.width, height: box.height }, editAs: "oneCell",
        });
      }
      if ((index + 1) % 10 === 0 && index < project.shots.length - 1) sheet.getRow(imageRow + 3).addPageBreak();
    });
  } else {
    sheet.columns = [{ width: 22 }, { width: 26 }, { width: 22 }, { width: 26 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }];
    let rowNo = 4;
    (project.notices || []).forEach((notice) => {
      sheet.mergeCells(rowNo, 1, rowNo, 8);
      sheet.getCell(rowNo, 1).value = notice.title;
      sheet.getCell(rowNo, 1).font = { size: 16, bold: true };
      sheet.getRow(rowNo).height = 32;
      sheet.getRow(rowNo + 1).values = ["拍摄日期", notice.date, "第一镜时间", notice.firstRoll || "待定", "拍摄地点", notice.location || "待定", "天气", notice.weather || "待定"];
      sheet.mergeCells(rowNo + 2, 1, rowNo + 2, 8);
      sheet.getCell(rowNo + 2, 1).value = notice.note || "";
      rowNo += 4;
    });
  }
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { ...cell.font, name: "Noto Sans SC", color: cell.font?.color || { argb: "FF202124" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      if (rowNumber >= 4) cell.border = {
        top: { style: "thin", color: { argb: "FF888888" } }, left: { style: "thin", color: { argb: "FF888888" } },
        bottom: { style: "thin", color: { argb: "FF888888" } }, right: { style: "thin", color: { argb: "FF888888" } },
      };
    });
  });
  sheet.headerFooter.oddFooter = `&L&KFFC400${project.client || "MediaStory"}&R${project.name} · ${exportType} · &P / &N`;
  sheet.pageSetup.printArea = `A1:${exportType === "故事板" ? "E" : exportType === "拍摄计划" ? "I" : "H"}${Math.max(4, sheet.rowCount)}`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as {
      format?: "pdf" | "xlsx";
      exportType?: string;
      project?: ExportProject;
      fontSize?: string;
      maxColumns?: number;
      brandLogo?: string;
      headerColor?: string;
    };
    const project = body.project;
    if (!project?.name || !Array.isArray(project.shots)) {
      return NextResponse.json({ error: "Invalid export data" }, { status: 400 });
    }
    const format = body.format === "xlsx" ? "xlsx" : "pdf";
    const exportType = body.exportType || "分镜";
    const data = format === "xlsx"
      ? await makeExcel(project, exportType, body)
      : await makePdf(project, exportType, body);
    const mime = format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": mime,
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName(project.name)}-${safeName(exportType)}.${format}`)}`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
