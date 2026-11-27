import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ColumnSetting = {
  key: string;
  label: string;
  width: number;
  visible: boolean;
  custom?: boolean;
};

type Shot = {
  id: string;
  no: number;
  scene: string;
  title: string;
  description: string;
  shotSize: string;
  movement: string;
  duration: number;
  dialogue: string;
  status: "待拍摄" | "已完成";
  color: string;
  image?: string;
  note?: string;
  sellingPoint?: string;
  props?: string;
  customFields?: Record<string, string>;
};

function authorized(request: NextRequest) {
  const expected = process.env.ACCESS_KEY || "wangwenzhi";
  const given = request.headers.get("x-access-key") || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      currentCell = "";
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function decodeText(buffer: Buffer): string {
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    let text = utf8Decoder.decode(buffer);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    return text;
  } catch {
    try {
      const gbkDecoder = new TextDecoder("gbk");
      return gbkDecoder.decode(buffer);
    } catch {
      return buffer.toString("utf8");
    }
  }
}

function cellToText(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val).trim();
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "object") {
    if (Array.isArray(val.richText)) {
      return val.richText.map((item: any) => item?.text || "").join("").trim();
    }
    if (val.result !== undefined) {
      return cellToText(val.result);
    }
    if (val.text !== undefined) {
      return cellToText(val.text);
    }
  }
  return String(val || "").trim();
}

function extractRowsAndImagesFromExcel(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  return wb.xlsx.load(buffer as unknown as ExcelJS.Buffer).then(() => {
    const sheet = wb.worksheets.find((s) => s.name.includes("分镜") || s.name.includes("Shot")) || wb.worksheets[0];
    if (!sheet) return { rawRows: [] as string[][], rowImages: new Map<number, string>() };

    const rawRows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      while (rawRows.length < rowNumber - 1) {
        rawRows.push([]);
      }
      const rowArr: string[] = [];
      const colCount = Math.max(sheet.columnCount || 0, Array.isArray(row.values) ? row.values.length : 0);
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        rowArr.push(cellToText(cell.value));
      }
      rawRows.push(rowArr);
    });

    const rowImages = new Map<number, string>();
    try {
      const images = sheet.getImages();
      for (const img of images) {
        if (!img.range?.tl) continue;
        const rowIdx = (img.range.tl as any).nativeRow !== undefined ? (img.range.tl as any).nativeRow : (img.range.tl as any).row;
        const media = (wb.model as any)?.media;
        let retrieved = null;
        if (media && Array.isArray(media)) {
          const m = media[Number(img.imageId)];
          if (m?.buffer) retrieved = m;
        }
        if (!retrieved && typeof (wb as any).getImage === "function") {
          try {
            retrieved = (wb as any).getImage(Number(img.imageId));
          } catch {
            // ignore
          }
        }
        if (retrieved?.buffer) {
          const ext = retrieved.extension || "jpeg";
          const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
          const dataUrl = `data:${mime};base64,${Buffer.from(retrieved.buffer).toString("base64")}`;
          rowImages.set(rowIdx, dataUrl);
        }
      }
    } catch {
      // ignore image extract error
    }

    return { rawRows, rowImages };
  });
}

function processRawRows(rawRows: string[][], rowImages: Map<number, string>, fileName: string) {
  let headerRowIndex = -1;
  let maxScore = 0;
  const standardKeywords = [
    "镜号", "序号", "镜头", "画面", "景别", "时长", "内容", "描述", "备注", "卖点", "道具", "场景", "台词", "运镜",
  ];

  for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
    const row = rawRows[r] || [];
    let score = 0;
    for (const cell of row) {
      if (!cell || typeof cell !== "string") continue;
      if (standardKeywords.some((kw) => cell.includes(kw))) {
        score++;
      }
    }
    if (score >= 2 && score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  let projectName = "";
  for (let r = 0; r < headerRowIndex; r++) {
    const row = rawRows[r] || [];
    const firstNonEmpty = row.find((c) => c && typeof c === "string" && c.trim().length > 0);
    if (firstNonEmpty) {
      projectName = firstNonEmpty.trim();
      break;
    }
  }
  if (!projectName) {
    projectName = fileName.replace(/\.[^/.]+$/, "") || "导入分镜项目";
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const colMappings: Array<{ colIdx: number; field: string; customLabel?: string }> = [];
  const columnSettings: ColumnSetting[] = [];

  headerRow.forEach((colName, colIdx) => {
    const name = colName.trim();
    if (!name) return;

    if (/^(镜号|序号|no|镜头号|镜头)$/i.test(name)) {
      colMappings.push({ colIdx, field: "no" });
    } else if (/^(画面|分镜|图片|参考图|shot|image)$/i.test(name)) {
      colMappings.push({ colIdx, field: "image" });
      columnSettings.push({ key: "image", label: name, width: 180, visible: true });
    } else if (/^(景别|镜头景别|size|shot size)$/i.test(name)) {
      colMappings.push({ colIdx, field: "shotSize" });
      columnSettings.push({ key: "shotSize", label: name, width: 80, visible: true });
    } else if (/^(时长|时长（秒）|时长\(秒\)|秒数|时间|duration)$/i.test(name)) {
      colMappings.push({ colIdx, field: "duration" });
      columnSettings.push({ key: "duration", label: name, width: 85, visible: true });
    } else if (/^(内容|分镜内容|画面描述|描述|画面内容|剧本|content|description)$/i.test(name)) {
      colMappings.push({ colIdx, field: "description" });
      columnSettings.push({ key: "content", label: name, width: 320, visible: true });
    } else if (/^(备注|说明|提示|后期|特效|note)$/i.test(name)) {
      colMappings.push({ colIdx, field: "note" });
      columnSettings.push({ key: "note", label: name, width: 190, visible: true });
    } else if (/^(卖点|产品卖点|特点|selling point)$/i.test(name)) {
      colMappings.push({ colIdx, field: "sellingPoint" });
      columnSettings.push({ key: "sellingPoint", label: name, width: 150, visible: true });
    } else if (/^(道具|服装道具|props)$/i.test(name)) {
      colMappings.push({ colIdx, field: "props" });
      columnSettings.push({ key: "props", label: name, width: 140, visible: true });
    } else if (/^(场景|拍摄场景|scene)$/i.test(name)) {
      colMappings.push({ colIdx, field: "scene" });
    } else if (/^(运镜|镜头运动|movement)$/i.test(name)) {
      colMappings.push({ colIdx, field: "movement" });
    } else if (/^(台词|对白|旁白|dialogue)$/i.test(name)) {
      colMappings.push({ colIdx, field: "dialogue" });
    } else {
      const customKey = `custom_${colIdx}`;
      colMappings.push({ colIdx, field: customKey, customLabel: name });
      columnSettings.push({ key: customKey, label: name, width: 140, visible: true, custom: true });
    }
  });

  if (!columnSettings.some((c) => c.key === "content")) {
    columnSettings.push({ key: "content", label: "内容", width: 320, visible: true });
  }

  const shots: Shot[] = [];
  let shotIndex = 1;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every((c) => !c.trim())) continue;

    const shot: Shot = {
      id: `shot-${shotIndex}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      no: shotIndex,
      scene: "",
      title: "",
      description: "",
      shotSize: "",
      movement: "",
      duration: 0,
      dialogue: "",
      status: "待拍摄",
      color: "#e8eceb",
      note: "",
      sellingPoint: "",
      props: "",
      image: "",
      customFields: {},
    };

    if (rowImages.has(r)) {
      shot.image = rowImages.get(r);
    } else if (rowImages.has(r + 1)) {
      shot.image = rowImages.get(r + 1);
    }

    colMappings.forEach(({ colIdx, field, customLabel }) => {
      const val = row[colIdx] ? row[colIdx].trim() : "";
      if (!val) return;

      if (field === "no") {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) shot.no = parsed;
      } else if (field === "duration") {
        const num = parseFloat(val.replace(/[^\d.]/g, ""));
        shot.duration = isNaN(num) ? 0 : num;
      } else if (field === "description") {
        shot.description = val;
      } else if (field === "shotSize") {
        shot.shotSize = val;
      } else if (field === "note") {
        shot.note = val;
      } else if (field === "sellingPoint") {
        shot.sellingPoint = val;
      } else if (field === "props") {
        shot.props = val;
      } else if (field === "scene") {
        shot.scene = val;
      } else if (field === "movement") {
        shot.movement = val;
      } else if (field === "dialogue") {
        shot.dialogue = val;
      } else if (field === "image") {
        if (!shot.image) shot.image = val;
      } else if (customLabel) {
        if (!shot.customFields) shot.customFields = {};
        shot.customFields[customLabel] = val;
      }
    });

    shots.push(shot);
    shotIndex++;
  }

  return { projectName, columnSettings, shots };
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let buffer: Buffer;
    let fileName = "导入分镜.xlsx";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "未接收到上传文件" }, { status: 400 });
      }
      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const body = await request.json();
      fileName = body.fileName || "导入分镜.xlsx";
      if (body.fileData) {
        if (typeof body.fileData === "string" && body.fileData.startsWith("data:")) {
          const base64Data = body.fileData.split(",")[1];
          buffer = Buffer.from(base64Data, "base64");
        } else if (body.isBase64) {
          buffer = Buffer.from(body.fileData, "base64");
        } else {
          buffer = Buffer.from(body.fileData, "utf8");
        }
      } else {
        return NextResponse.json({ error: "未接收到文件数据" }, { status: 400 });
      }
    }

    // Check if buffer is an Excel ZIP archive (PK..)
    const isZipOrXlsx = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;

    let rawRows: string[][] = [];
    let rowImages = new Map<number, string>();

    if (isZipOrXlsx) {
      const result = await extractRowsAndImagesFromExcel(buffer);
      rawRows = result.rawRows;
      rowImages = result.rowImages;
    } else {
      const text = decodeText(buffer);
      rawRows = parseCsv(text);
    }

    const { projectName, columnSettings, shots } = processRawRows(rawRows, rowImages, fileName);

    return NextResponse.json({
      success: true,
      projectName,
      columnSettings,
      shots,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    const msg = error?.message ? `解析分镜文件失败: ${error.message}` : "解析分镜文件失败，请检查文件格式是否为 Excel (.xlsx) 或 CSV 表格";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
