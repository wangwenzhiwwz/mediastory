import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "workspace.json");
const allowedShotSizes = new Set(["", "大全景", "全景", "中全景", "中景", "近景", "特写"]);

const seed = {
  activeProjectId: "project-spark",
  projects: [{
    id: "project-spark",
    name: "春日气泡水广告",
    client: "青屿气泡水",
    format: "9:16 竖屏",
    dueDate: "2026-08-08",
    script: "清晨，阳光穿过窗帘。一罐冰镇气泡水被打开，气泡声唤醒整个房间。主人公带着它走进夏日街头。旁白：轻一点，世界就近一点。",
    shots: [
      { id: "shot-1", no: 1, scene: "场景 1 · 室内清晨", title: "阳光入场", description: "晨光透过白色窗帘，在桌面缓慢移动，产品处于画面暗部。", shotSize: "全景", movement: "推镜", duration: 3, dialogue: "", status: "已完成", color: "#d9c9a7" },
      { id: "shot-2", no: 2, scene: "场景 1 · 室内清晨", title: "冰汽凝结", description: "水珠沿着罐身滑落，品牌标识逐渐清晰。", shotSize: "特写", movement: "固定", duration: 2, dialogue: "嘶——", status: "待拍摄", color: "#bad8d4" },
      { id: "shot-3", no: 3, scene: "场景 1 · 室内清晨", title: "开启瞬间", description: "手指拉开拉环，气泡和水雾迸发，逆光拍摄。", shotSize: "特写", movement: "固定", duration: 2, dialogue: "", status: "待拍摄", color: "#c8d9c1" },
      { id: "shot-4", no: 4, scene: "场景 2 · 街道日景", title: "走进夏天", description: "主人公拿着气泡水走出门，镜头从侧后方跟随。", shotSize: "中景", movement: "跟拍", duration: 4, dialogue: "轻一点，世界就近一点。", status: "待拍摄", color: "#e2bc91" },
      { id: "shot-5", no: 5, scene: "场景 2 · 街道日景", title: "产品定格", description: "产品置于画面中央，背景人物虚化掠过，落版品牌口号。", shotSize: "近景", movement: "环绕", duration: 3, dialogue: "青屿气泡水", status: "待拍摄", color: "#a9c9c1" }
    ]
  }]
};

function authorized(request: NextRequest) {
  const expected = process.env.ACCESS_KEY || "wangwenzhi";
  const given = request.headers.get("x-access-key") || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function ensureData() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(seed, null, 2), "utf8");
  }
}

function normalizeWorkspace(payload: any) {
  if (!payload || !Array.isArray(payload.projects)) return payload;
  return {
    ...payload,
    projects: payload.projects.map((project: any) => ({
      ...project,
      shots: Array.isArray(project.shots) ? project.shots.map((shot: any) => ({
        ...shot,
        shotSize: allowedShotSizes.has(String(shot.shotSize || "")) ? String(shot.shotSize || "") : "",
      })) : [],
    })),
  };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureData();
  return NextResponse.json(normalizeWorkspace(JSON.parse(await readFile(dataFile, "utf8"))));
}

export async function PUT(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = normalizeWorkspace(await request.json());
  if (!payload || !Array.isArray(payload.projects)) return NextResponse.json({ error: "Invalid workspace" }, { status: 400 });
  await ensureData();
  const tmp = `${dataFile}.tmp`;
  payload.updatedAt = new Date().toISOString();
  await writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
  await rename(tmp, dataFile);
  return NextResponse.json({ ok: true, updatedAt: payload.updatedAt });
}
