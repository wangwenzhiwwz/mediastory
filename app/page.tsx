"use client";

import {
  ArrowLeft, ArrowCounterClockwise, ArrowClockwise, ArrowUUpLeft, ArrowUUpRight,
  Bell, CaretDown, CaretUp, Check, CirclesFour, Clock, Copy,
  DotsSixVertical, DotsThree, DownloadSimple, Eye, EyeSlash, Export, FileArrowDown,
  FilmSlate, Folder, FolderOpen, GearSix, ImageSquare, List, MagnifyingGlass,
  Nut, PencilSimple, Play, Plus, Rows, ShareNetwork, SlidersHorizontal,
  SquaresFour, TextT, Trash, UploadSimple, UserPlus, UsersThree, X,
} from "@phosphor-icons/react";
import { ChangeEvent, DragEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Shot = {
  id: string; no: number; scene: string; title: string; description: string;
  shotSize: string; movement: string; duration: number; dialogue: string;
  status: "待拍摄" | "已完成"; color: string; image?: string; note?: string;
  sellingPoint?: string; props?: string;
  customFields?: Record<string, string>;
};
type ColumnSetting = {
  key: string; label: string; width: number; visible: boolean; custom?: boolean;
};
type ColumnTemplate = { id: string; name: string; columns: ColumnSetting[] };
type Project = {
  id: string; name: string; client: string; format: string; dueDate: string;
  script: string; shots: Shot[]; createdAt?: string; notices?: Notice[];
  columnSettings?: ColumnSetting[];
};
type Notice = {
  id: string; title: string; date: string; firstRoll: string; location: string;
  weather: string; note: string; status: "待执行" | "已过期";
  people: { role: string; name: string }[];
};
type Workspace = { projects: Project[]; activeProjectId: string; updatedAt?: string; columnTemplates?: ColumnTemplate[] };

const emptyWorkspace: Workspace = { projects: [], activeProjectId: "" };
const shotSizes = ["大全景", "全景", "中全景", "中景", "近景", "特写"];
const fallbackImages = [
  "https://images.unsplash.com/photo-1604079628040-94301bb21b91?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1527960471264-932f39eb5846?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1531988042231-d39a9cc12a9a?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=82",
  "https://images.unsplash.com/photo-1553456558-aff63285bdd1?auto=format&fit=crop&w=900&q=82",
];
const flowTabs = ["分镜制作", "故事板", "拍摄计划", "拍摄通告"];

function MediaStoryLogo({ className = "", dotColor = "#FFBE18" }: { className?: string; dotColor?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="MediaStory Logo">
      <path
        d="M 24 66 C 24 41, 33 29, 41 29 C 47 29, 49 37, 50 42 C 51 37, 53 29, 59 29 C 67 29, 76 41, 76 66"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="64" r="5" fill={dotColor} />
    </svg>
  );
}

function StoryboardFolderVisual({ count }: { count: number }) {
  return (
    <div className="folder-visual-wrap">
      <svg width="140" height="98" viewBox="0 0 140 98" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="folderBackGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFBA18"/>
            <stop offset="100%" stopColor="#EAA000"/>
          </linearGradient>
          <linearGradient id="folderFrontGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE075"/>
            <stop offset="100%" stopColor="#FFB814"/>
          </linearGradient>
          <filter id="fShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#D97706" floodOpacity="0.28"/>
          </filter>
          <filter id="pShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.08"/>
          </filter>
        </defs>

        <path d="M 6 16 C 6 10, 10 6, 17 6 L 44 6 C 49 6, 53 9, 56 13 L 61 19 L 122 19 C 128 19, 133 23, 133 30 L 133 84 C 133 90, 128 94, 122 94 L 17 94 C 10 94, 6 90, 6 84 Z" fill="url(#folderBackGrad)" />
        <rect x="14" y="14" width="112" height="68" rx="6" fill="#FFFFFF" filter="url(#pShadow)" stroke="#F1F5F9" strokeWidth="1"/>
        <rect x="6" y="30" width="128" height="64" rx="10" fill="url(#folderFrontGrad)" filter="url(#fShadow)" />
        <rect x="16" y="40" width="108" height="44" rx="6" fill="#FFFFFF" fillOpacity="0.88" />
      </svg>
      {count > 0 && <span className="folder-count-pill">{count}</span>}
    </div>
  );
}

function formatProjectDate(isoStr?: string) {
  if (!isoStr) return "刚刚";
  try {
    const d = new Date(isoStr);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `创建 ${m}-${day} ${h}:${min}`;
  } catch {
    return "刚刚";
  }
}

export const standard7Columns: ColumnSetting[] = [
  { key: "image", label: "画面", width: 180, visible: true },
  { key: "shotSize", label: "景别", width: 80, visible: true },
  { key: "duration", label: "时长 (秒)", width: 85, visible: true },
  { key: "content", label: "内容", width: 320, visible: true },
  { key: "note", label: "备注", width: 190, visible: true },
  { key: "sellingPoint", label: "卖点", width: 150, visible: true },
];

export const movie8Columns: ColumnSetting[] = [
  { key: "image", label: "画面", width: 180, visible: true },
  { key: "shotSize", label: "景别", width: 80, visible: true },
  { key: "duration", label: "时长 (秒)", width: 85, visible: true },
  { key: "content", label: "内容", width: 300, visible: true },
  { key: "note", label: "备注", width: 180, visible: true },
  { key: "sellingPoint", label: "卖点", width: 140, visible: true },
  { key: "props", label: "道具", width: 140, visible: true },
];

export const minimal4Columns: ColumnSetting[] = [
  { key: "image", label: "画面", width: 220, visible: true },
  { key: "duration", label: "时长 (秒)", width: 90, visible: true },
  { key: "content", label: "内容", width: 380, visible: true },
  { key: "note", label: "备注", width: 200, visible: true },
];

export const builtinTemplates: ColumnTemplate[] = [
  {
    id: "builtin-xie",
    name: "谢老师",
    columns: [
      { key: "image", label: "画面", width: 180, visible: true },
      { key: "shotSize", label: "景别", width: 80, visible: true },
      { key: "reference", label: "参考", width: 140, visible: true },
      { key: "duration", label: "时长 (秒)", width: 85, visible: true },
      { key: "content", label: "内容", width: 320, visible: true },
      { key: "note", label: "备注", width: 180, visible: true },
    ],
  },
  {
    id: "builtin-simple",
    name: "简洁",
    columns: [
      { key: "image", label: "画面", width: 200, visible: true },
      { key: "shotSize", label: "景别", width: 90, visible: true },
      { key: "duration", label: "时长 (秒)", width: 90, visible: true },
      { key: "content", label: "内容", width: 340, visible: true },
      { key: "note", label: "备注", width: 200, visible: true },
    ],
  },
  {
    id: "builtin-visual",
    name: "画面",
    columns: [
      { key: "image", label: "画面", width: 220, visible: true },
      { key: "reference", label: "参考", width: 140, visible: true },
      { key: "content", label: "内容", width: 320, visible: true },
      { key: "note", label: "备注", width: 180, visible: true },
      { key: "duration", label: "时长 (秒)", width: 85, visible: true },
      { key: "sound", label: "声音", width: 160, visible: true },
    ],
  },
];

const defaultColumns: ColumnSetting[] = standard7Columns;
const blankImage = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#f0f2f3"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#a8adb0" font-family="sans-serif" font-size="28">未添加图片</text></svg>`,
);

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.max(1, Math.ceil(items.length / size)) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );
}

export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [accessKey, setAccessKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [saveState, setSaveState] = useState("已保存");
  const [screen, setScreen] = useState<"projects" | "project" | "export">("projects");
  const [tab, setTab] = useState("分镜制作");
  const [search, setSearch] = useState("");
  const [projectMenu, setProjectMenu] = useState<string | null>(null);
  const [newMenu, setNewMenu] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState<"display" | "columns" | null>(null);
  const [selectionMenu, setSelectionMenu] = useState(false);
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>(defaultColumns);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedShotIds, setSelectedShotIds] = useState<string[]>([]);
  const [editingShot, setEditingShot] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [noticeDraft, setNoticeDraft] = useState<Notice | null>(null);
  const [noticeStep, setNoticeStep] = useState(1);
  const [exportType, setExportType] = useState("分镜");
  const [exportFormat, setExportFormat] = useState("PDF 文件");
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [dragId, setDragId] = useState("");
  const [dropTargetId, setDropTargetId] = useState("");
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState("横");
  const [fontSizeSetting, setFontSizeSetting] = useState<"小" | "中" | "大">("中");
  const [imageSizeSetting, setImageSizeSetting] = useState("小");
  const [maxColumns, setMaxColumns] = useState(7);
  const [headerColor, setHeaderColor] = useState("#000000");
  const [brandLogo, setBrandLogo] = useState("ulefone");
  const [newProjectMenu, setNewProjectMenu] = useState(false);
  const [importModalData, setImportModalData] = useState<{
    projectName: string;
    shots: Shot[];
    columnSettings: ColumnSetting[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const projectExcelInputRef = useRef<HTMLInputElement>(null);
  const [activeColMenu, setActiveColMenu] = useState<string | null>(null);
  const [editingCol, setEditingCol] = useState<ColumnSetting | null>(null);
  const [showAddColPopover, setShowAddColPopover] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [showTemplatesLibraryModal, setShowTemplatesLibraryModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("builtin-xie");
  const [templateMenuId, setTemplateMenuId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ColumnTemplate | null>(null);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [topMoreMenu, setTopMoreMenu] = useState(false);
  const [storyboardSettingsMenu, setStoryboardSettingsMenu] = useState(false);
  const [history, setHistory] = useState<Array<{ shots: Shot[]; columnSettings: ColumnSetting[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [lastActiveCell, setLastActiveCell] = useState<{ shotId: string; colKey: string } | null>(null);
  const [showBatchInputModal, setShowBatchInputModal] = useState(false);
  const [batchInputValue, setBatchInputValue] = useState("");
  const [showBatchPasteModal, setShowBatchPasteModal] = useState(false);
  const [batchPasteValue, setBatchPasteValue] = useState("");
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showMovePositionModal, setShowMovePositionModal] = useState(false);
  const [moveTargetPosition, setMoveTargetPosition] = useState("1");
  const [showBatchShotsFillModal, setShowBatchShotsFillModal] = useState(false);
  const [batchFillShotSize, setBatchFillShotSize] = useState("");
  const [batchFillDuration, setBatchFillDuration] = useState("");
  const [batchFillContent, setBatchFillContent] = useState("");
  const [batchFillNote, setBatchFillNote] = useState("");

  const project = workspace.projects.find((p) => p.id === workspace.activeProjectId) ?? workspace.projects[0];
  const projects = workspace.projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase()));
  const totalDuration = useMemo(() => project?.shots.reduce((sum, s) => sum + Number(s.duration), 0) ?? 0, [project]);
  const sceneGroups = useMemo(() => {
    const groups = new Map<string, Shot[]>();
    project?.shots.forEach((shot) => groups.set(shot.scene || "未规划镜头", [...(groups.get(shot.scene || "未规划镜头") || []), shot]));
    return [...groups.entries()];
  }, [project]);
  const storyboardPages = useMemo(() => chunk(project?.shots || [], 6), [project?.shots]);
  const storyPages = useMemo(() => chunk(project?.shots || [], 10), [project?.shots]);
  const planBlocks = useMemo(() => sceneGroups.flatMap(([scene, shots]) =>
    chunk(shots, 5).map((pageShots, index) => ({
      scene: `${scene}${index ? "（续）" : ""}`,
      targetScene: scene === "未规划镜头" ? "" : scene,
      shots: pageShots,
    })),
  ), [sceneGroups]);
  const planPages = useMemo(() => chunk(planBlocks, 3), [planBlocks]);
  const noticePages = useMemo(() => chunk(project?.notices || [], 2), [project?.notices]);
  const visibleColumnSettings = useMemo(() => columnSettings.filter((column) => column.visible), [columnSettings]);
  const tableTemplate = useMemo(() => {
    const colWidths = visibleColumnSettings.map((column) => {
      if (column.key === "content") return `minmax(${column.width || 240}px, 1fr)`;
      return `${column.width}px`;
    });
    return ["44px", "28px", "46px", ...colWidths, "44px"].join(" ");
  }, [visibleColumnSettings]);

  useEffect(() => {
    const stored = sessionStorage.getItem("mediastory-key") || "";
    if (!stored) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    void loadWorkspace(stored);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      if (typeof document !== "undefined" && document.body.classList.contains("is-dragging-shot")) {
        document.body.classList.remove("is-dragging-shot");
      }
    };
    window.addEventListener("dragend", handleGlobalDragEnd);
    window.addEventListener("drop", handleGlobalDragEnd);
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
      window.removeEventListener("drop", handleGlobalDragEnd);
    };
  }, []);

  useEffect(() => {
    const pasteTarget = hoveredImageId || selectedImageId;
    const handlePaste = (event: ClipboardEvent) => {
      if (!pasteTarget) return;
      const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      applyImageFile(file, pasteTarget, "已从剪贴板粘贴图片");
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNewMenu(false); setNewProjectMenu(false); setSettingsMenu(null); setSelectionMenu(false); setSelectedImageId(null); setImportModalData(null);
        setActiveColMenu(null); setShowAddColPopover(false); setTopMoreMenu(false); setStoryboardSettingsMenu(false); setEditingCol(null);
      }
      if (event.key === "Escape") {
        if (batchMode) {
          event.preventDefault();
          setBatchMode(false);
          setSelectedCells(new Set());
          setToast("已退出批量编辑模式");
          return;
        }
      }
      if (event.altKey && event.key.toLowerCase() === "n" && screen === "project" && tab === "分镜制作") {
        event.preventDefault(); addShot();
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement | null;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (!isInput && batchMode && selectedCells.size > 0) {
          event.preventDefault();
          handleBatchClear();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        const target = event.target as HTMLElement | null;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (!isInput && batchMode && project) {
          event.preventDefault();
          const all = new Set<string>();
          project.shots.forEach((s) => {
            visibleColumnSettings.forEach((col) => {
              all.add(`${s.id}:::${col.key}`);
            });
          });
          setSelectedCells(all);
          setToast(`已全选 ${all.size} 个单元格`);
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        const target = event.target as HTMLElement | null;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (!isInput) {
          event.preventDefault();
          if (event.shiftKey) redo(); else undo();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        const target = event.target as HTMLElement | null;
        const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (!isInput) {
          event.preventDefault();
          redo();
        }
      }
    };
    const handleDocumentClick = () => {
      setActiveColMenu(null);
      setShowAddColPopover(false);
      setTopMoreMenu(false);
      setStoryboardSettingsMenu(false);
      setNewProjectMenu(false);
      setShowMoveMenu(false);
    };
    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("click", handleDocumentClick);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("click", handleDocumentClick);
    };
  }, [hoveredImageId, selectedImageId, screen, tab, project?.id, workspace, historyIndex, history.length]);

  async function loadWorkspace(key: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace", { headers: { "x-access-key": key } });
      if (!res.ok) throw new Error(res.status === 401 ? "访问口令不正确" : "无法读取项目数据");
      const data = await res.json() as Workspace;
      const active = data.projects.find((item) => item.id === data.activeProjectId) || data.projects[0];
      setWorkspace(data); setColumnSettings(active?.columnSettings?.length ? active.columnSettings : defaultColumns);
      setAccessKey(key); sessionStorage.setItem("mediastory-key", key); setLoginError("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "登录失败");
      sessionStorage.removeItem("mediastory-key");
    } finally { setLoading(false); }
  }

  async function persist(next: Workspace) {
    setWorkspace(next); setSaveState("保存中…");
    try {
      const res = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-access-key": accessKey },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      setSaveState("已保存");
    } catch { setSaveState("保存失败"); }
  }

  function pushHistory(shots: Shot[], cols: ColumnSetting[]) {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { shots, columnSettings: cols }].slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }

  function undo() {
    if (historyIndex <= 0 || !project) return;
    const targetIndex = historyIndex - 1;
    const target = history[targetIndex];
    if (!target) return;
    setHistoryIndex(targetIndex);
    setColumnSettings(target.columnSettings);
    void persist({
      ...workspace,
      projects: workspace.projects.map((p) => p.id === project.id ? { ...p, shots: target.shots, columnSettings: target.columnSettings } : p),
    });
    setToast("已撤回操作");
  }

  function redo() {
    if (historyIndex >= history.length - 1 || !project) return;
    const targetIndex = historyIndex + 1;
    const target = history[targetIndex];
    if (!target) return;
    setHistoryIndex(targetIndex);
    setColumnSettings(target.columnSettings);
    void persist({
      ...workspace,
      projects: workspace.projects.map((p) => p.id === project.id ? { ...p, shots: target.shots, columnSettings: target.columnSettings } : p),
    });
    setToast("已重做操作");
  }

  function hideColumn(key: string) {
    const next = columnSettings.map((c) => c.key === key ? { ...c, visible: false } : c);
    commitColumns(next);
    const col = columnSettings.find((c) => c.key === key);
    setToast(`已隐藏“${col?.label || "此"}”列（可在列设置中恢复）`);
  }

  function updateProject(patch: Partial<Project>, recordHistory = true) {
    if (!project) return;
    if (recordHistory) {
      const nextShots = patch.shots !== undefined ? patch.shots : project.shots;
      const nextCols = patch.columnSettings !== undefined ? patch.columnSettings : columnSettings;
      pushHistory(nextShots, nextCols);
    }
    void persist({ ...workspace, projects: workspace.projects.map((p) => p.id === project.id ? { ...p, ...patch } : p) });
  }

  function commitColumns(next: ColumnSetting[]) {
    setColumnSettings(next);
    updateProject({ columnSettings: next });
  }

  function updateColumn(key: string, patch: Partial<ColumnSetting>) {
    commitColumns(columnSettings.map((column) => column.key === key ? { ...column, ...patch } : column));
  }

  function moveColumnOrder(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= columnSettings.length) return;
    const next = [...columnSettings];
    const [removed] = next.splice(index, 1);
    next.splice(targetIndex, 0, removed);
    commitColumns(next);
  }

  function handleAddCustomCol() {
    if (!newColName.trim()) return;
    const next = [...columnSettings, {
      key: uid("column"),
      label: newColName.trim(),
      width: 150,
      visible: true,
      custom: true,
    }];
    commitColumns(next);
    setNewColName("");
    setToast(`已添加列“${newColName.trim()}”`);
  }

  function addCustomColumn() {
    setShowColumnModal(true);
  }

  function saveColumnTemplate() {
    setTemplateNameInput(`${project?.name || "自定义"}列模板`);
    setShowSaveTemplateModal(true);
  }

  function doSaveTemplate() {
    if (!templateNameInput.trim()) return;
    const template: ColumnTemplate = {
      id: uid("template"),
      name: templateNameInput.trim(),
      columns: columnSettings.map((column) => ({ ...column })),
    };
    const nextTemplates = [...(workspace.columnTemplates || []), template];
    void persist({ ...workspace, columnTemplates: nextTemplates });
    setToast(`已成功保存模板 “${templateNameInput.trim()}”`);
    setShowSaveTemplateModal(false);
  }

  function applyColumnTemplate(id: string) {
    const all = [...builtinTemplates, ...(workspace.columnTemplates || [])];
    const template = all.find((item) => item.id === id);
    if (template) commitColumns(template.columns.map((column) => ({ ...column })));
  }

  function applyColumnTemplateObj(tmpl: ColumnTemplate) {
    commitColumns(tmpl.columns.map((c) => ({ ...c })));
    setToast(`已应用“${tmpl.name}”分镜模板`);
    setShowTemplatesLibraryModal(false);
  }

  function handleSaveNewTemplate() {
    const name = newTemplateName.trim() || `自定义模板 ${(workspace.columnTemplates?.length || 0) + 1}`;
    const colsToSave = columnSettings.length ? columnSettings : defaultColumns;
    const newTmpl: ColumnTemplate = {
      id: uid("tmpl"),
      name,
      columns: colsToSave.map((c) => ({ ...c })),
    };
    const nextTemplates = [...(workspace.columnTemplates || []), newTmpl];
    void persist({ ...workspace, columnTemplates: nextTemplates });
    setShowNewTemplateModal(false);
    setSelectedTemplateId(newTmpl.id);
    setToast(`已成功创建模板“${name}”`);
  }

  function handleSaveEditedTemplate() {
    if (!editingTemplate) return;
    const name = editingTemplate.name.trim() || "未命名模板";
    const isBuiltin = builtinTemplates.some((b) => b.id === editingTemplate.id);
    let nextTemplates = [...(workspace.columnTemplates || [])];
    if (isBuiltin) {
      const forked: ColumnTemplate = {
        ...editingTemplate,
        id: uid("tmpl"),
        name: `${name} (自定义)`,
      };
      nextTemplates.push(forked);
      setSelectedTemplateId(forked.id);
      setToast(`已另存为自定义模板“${forked.name}”`);
    } else {
      nextTemplates = nextTemplates.map((t) => (t.id === editingTemplate.id ? { ...editingTemplate, name } : t));
      setToast(`已保存模板“${name}”`);
    }
    void persist({ ...workspace, columnTemplates: nextTemplates });
    setEditingTemplate(null);
  }

  function handleDeleteTemplate(id: string, name: string) {
    if (!confirm(`确定删除模板“${name}”？`)) return;
    const nextTemplates = (workspace.columnTemplates || []).filter((t) => t.id !== id);
    void persist({ ...workspace, columnTemplates: nextTemplates });
    setTemplateMenuId(null);
    if (selectedTemplateId === id) setSelectedTemplateId("builtin-xie");
    setToast(`已删除模板“${name}”`);
  }

  function handleDuplicateTemplate(tmpl: ColumnTemplate) {
    const copy: ColumnTemplate = {
      id: uid("tmpl"),
      name: `${tmpl.name} 副本`,
      columns: tmpl.columns.map((c) => ({ ...c })),
    };
    const nextTemplates = [...(workspace.columnTemplates || []), copy];
    void persist({ ...workspace, columnTemplates: nextTemplates });
    setTemplateMenuId(null);
    setSelectedTemplateId(copy.id);
    setToast(`已复制模板“${copy.name}”`);
  }

  function updateShot(id: string, patch: Partial<Shot>) {
    if (!project) return;
    updateProject({ shots: project.shots.map((shot) => shot.id === id ? { ...shot, ...patch } : shot) });
  }

  function isEmptyShot(shot: Shot): boolean {
    const isCustomImage = Boolean(shot.image && shot.image.trim() !== "" && shot.image !== blankImage);
    const isFallbackImage = shot.image === undefined && Boolean(fallbackImages[(shot.no - 1) % fallbackImages.length]);
    const hasDisplayImage = isCustomImage || isFallbackImage;

    const hasTextContent = Boolean(
      (shot.description && shot.description.trim() !== "") ||
      (shot.dialogue && shot.dialogue.trim() !== "") ||
      (shot.note && shot.note.trim() !== "") ||
      (shot.shotSize && shot.shotSize.trim() !== "")
    );

    if (!hasDisplayImage && !hasTextContent) return true;
    if (!hasDisplayImage) return true;
    return false;
  }

  function selectEmptyShots() {
    if (!project) return;
    const emptyShots = project.shots.filter(isEmptyShot);
    if (emptyShots.length === 0) {
      setToast("当前分镜中暂无空镜头");
      return;
    }
    setSelectedShotIds(emptyShots.map((s) => s.id));
    setToast(`已选中 ${emptyShots.length} 个空镜头`);
  }

  function toggleSelectShot(id: string) {
    setSelectedShotIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function moveSelectedShots(mode: "front" | "end" | "position", targetPos?: number) {
    if (!project || selectedShotIds.length === 0) return;
    const selected = project.shots.filter((s) => selectedShotIds.includes(s.id));
    const unselected = project.shots.filter((s) => !selectedShotIds.includes(s.id));

    let nextShots: Shot[] = [];
    if (mode === "front") {
      nextShots = [...selected, ...unselected];
    } else if (mode === "end") {
      nextShots = [...unselected, ...selected];
    } else if (mode === "position") {
      const idx = Math.max(0, Math.min(unselected.length, (targetPos || 1) - 1));
      nextShots = [
        ...unselected.slice(0, idx),
        ...selected,
        ...unselected.slice(idx),
      ];
    }
    const renumbered = nextShots.map((s, i) => ({ ...s, no: i + 1 }));
    updateProject({ shots: renumbered });
    setToast(
      mode === "front"
        ? `已将 ${selected.length} 个镜头移至最前`
        : mode === "end"
        ? `已将 ${selected.length} 个镜头移至最后`
        : `已将 ${selected.length} 个镜头移动至第 ${targetPos} 镜`
    );
    setShowMoveMenu(false);
    setShowMovePositionModal(false);
  }

  function duplicateSelectedShots() {
    if (!project || selectedShotIds.length === 0) return;
    const nextShots: Shot[] = [];
    const newSelectedIds: string[] = [];

    project.shots.forEach((shot) => {
      nextShots.push(shot);
      if (selectedShotIds.includes(shot.id)) {
        const clonedId = uid("shot");
        newSelectedIds.push(clonedId);
        nextShots.push({
          ...shot,
          id: clonedId,
          customFields: { ...(shot.customFields || {}) },
        });
      }
    });

    const renumbered = nextShots.map((s, i) => ({ ...s, no: i + 1 }));
    updateProject({ shots: renumbered });
    setSelectedShotIds(newSelectedIds);
    setToast(`已复制 ${selectedShotIds.length} 个镜头`);
  }

  function applyBatchFillToShots(patch: Partial<Shot>) {
    if (!project || selectedShotIds.length === 0) return;
    const nextShots = project.shots.map((s) =>
      selectedShotIds.includes(s.id) ? { ...s, ...patch } : s
    );
    updateProject({ shots: nextShots });
    setToast(`已批量更新 ${selectedShotIds.length} 个镜头内容`);
    setShowBatchShotsFillModal(false);
  }

  function getCellValue(shot: Shot, colKey: string): string {
    if (colKey === "image") return shot.image || "";
    if (colKey === "shotSize") return shot.shotSize || "";
    if (colKey === "duration") return shot.duration ? String(shot.duration) : "";
    if (colKey === "content") return shot.description || "";
    if (colKey === "note") return shot.note || "";
    if (colKey === "sellingPoint") return shot.sellingPoint ?? shot.customFields?.["卖点"] ?? shot.customFields?.["sellingPoint"] ?? "";
    return shot.customFields?.[colKey] || "";
  }

  function applyValueToShot(shot: Shot, colKey: string, value: string): Shot {
    if (colKey === "shotSize") return { ...shot, shotSize: value };
    if (colKey === "duration") return { ...shot, duration: Number(value) || 0 };
    if (colKey === "content") return { ...shot, description: value };
    if (colKey === "note") return { ...shot, note: value };
    if (colKey === "sellingPoint") {
      return {
        ...shot,
        sellingPoint: value,
        customFields: { ...(shot.customFields || {}), sellingPoint: value, 卖点: value },
      };
    }
    if (colKey === "image") return { ...shot, image: value };
    return {
      ...shot,
      customFields: { ...(shot.customFields || {}), [colKey]: value },
    };
  }

  function handleCellClick(shotId: string, colKey: string, e: React.MouseEvent) {
    const cellKey = `${shotId}:::${colKey}`;
    if (e.ctrlKey || e.metaKey) {
      setSelectedCells((prev) => {
        const next = new Set(prev);
        if (next.has(cellKey)) next.delete(cellKey);
        else next.add(cellKey);
        return next;
      });
      setLastActiveCell({ shotId, colKey });
    } else if (e.shiftKey && lastActiveCell && project) {
      const fromRow = project.shots.findIndex((s) => s.id === lastActiveCell.shotId);
      const toRow = project.shots.findIndex((s) => s.id === shotId);
      const fromCol = visibleColumnSettings.findIndex((c) => c.key === lastActiveCell.colKey);
      const toCol = visibleColumnSettings.findIndex((c) => c.key === colKey);

      if (fromRow !== -1 && toRow !== -1 && fromCol !== -1 && toCol !== -1) {
        const minRow = Math.min(fromRow, toRow);
        const maxRow = Math.max(fromRow, toRow);
        const minCol = Math.min(fromCol, toCol);
        const maxCol = Math.max(fromCol, toCol);

        const next = new Set(selectedCells);
        for (let r = minRow; r <= maxRow; r++) {
          const s = project.shots[r];
          if (!s) continue;
          for (let c = minCol; c <= maxCol; c++) {
            const col = visibleColumnSettings[c];
            if (!col) continue;
            next.add(`${s.id}:::${col.key}`);
          }
        }
        setSelectedCells(next);
      }
    } else {
      setSelectedCells(new Set([cellKey]));
      setLastActiveCell({ shotId, colKey });
    }
  }

  function applyBatchInput(val: string) {
    if (!project || selectedCells.size === 0) return;
    const nextShots = project.shots.map((shot) => {
      let updatedShot = { ...shot };
      for (const cellKey of selectedCells) {
        const [sId, colKey] = cellKey.split(":::");
        if (sId === shot.id) {
          updatedShot = applyValueToShot(updatedShot, colKey, val);
        }
      }
      return updatedShot;
    });
    updateProject({ shots: nextShots });
    setToast(`已批量更新 ${selectedCells.size} 个单元格`);
    setShowBatchInputModal(false);
  }

  async function handleBatchPaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setShowBatchPasteModal(true);
        return;
      }
      applyPastedText(text);
    } catch {
      setShowBatchPasteModal(true);
    }
  }

  function applyPastedText(rawText: string) {
    if (!project) return;
    const lines = rawText.split(/\r?\n/).map((l) => l.split("\t")).filter((row) => row.some((c) => c.trim()));
    if (lines.length === 0) return;

    if (lines.length === 1 && lines[0].length === 1) {
      applyBatchInput(lines[0][0]);
      return;
    }

    const cellsArray = Array.from(selectedCells).map((k) => {
      const [shotId, colKey] = k.split(":::");
      const rowIdx = project.shots.findIndex((s) => s.id === shotId);
      const colIdx = visibleColumnSettings.findIndex((c) => c.key === colKey);
      return { shotId, colKey, rowIdx, colIdx };
    }).sort((a, b) => a.rowIdx !== b.rowIdx ? a.rowIdx - b.rowIdx : a.colIdx - b.colIdx);

    if (cellsArray.length === 1) {
      const startRow = cellsArray[0].rowIdx;
      const startCol = cellsArray[0].colIdx;
      let updatedShots = [...project.shots];
      let appliedCount = 0;
      lines.forEach((rowVals, rOffset) => {
        const targetRow = startRow + rOffset;
        if (targetRow < updatedShots.length) {
          rowVals.forEach((val, cOffset) => {
            const targetCol = startCol + cOffset;
            if (targetCol < visibleColumnSettings.length) {
              const colKey = visibleColumnSettings[targetCol].key;
              updatedShots[targetRow] = applyValueToShot(updatedShots[targetRow], colKey, val);
              appliedCount++;
            }
          });
        }
      });
      updateProject({ shots: updatedShots });
      setToast(`已成功粘贴 ${appliedCount} 个单元格数据`);
      setShowBatchPasteModal(false);
      return;
    }

    let flatValues = lines.flat();
    let updatedShots = [...project.shots];
    cellsArray.forEach((cell, idx) => {
      const val = flatValues[idx % flatValues.length];
      if (cell.rowIdx >= 0) {
        updatedShots[cell.rowIdx] = applyValueToShot(updatedShots[cell.rowIdx], cell.colKey, val);
      }
    });
    updateProject({ shots: updatedShots });
    setToast(`已成功批量粘贴到 ${cellsArray.length} 个单元格`);
    setShowBatchPasteModal(false);
  }

  function handleBatchClear() {
    if (!project || selectedCells.size === 0) return;
    const nextShots = project.shots.map((shot) => {
      let updatedShot = { ...shot };
      for (const cellKey of selectedCells) {
        const [sId, colKey] = cellKey.split(":::");
        if (sId === shot.id) {
          updatedShot = applyValueToShot(updatedShot, colKey, colKey === "duration" ? "0" : "");
        }
      }
      return updatedShot;
    });
    updateProject({ shots: nextShots });
    setToast(`已清空 ${selectedCells.size} 个单元格内容`);
  }

  function openProject(id: string) {
    const selected = workspace.projects.find((item) => item.id === id);
    setColumnSettings(selected?.columnSettings?.length ? selected.columnSettings : defaultColumns);
    void persist({ ...workspace, activeProjectId: id });
    setScreen("project"); setTab("分镜制作");
  }

  function addProject() {
    const newProject: Project = {
      id: uid("project"), name: "未命名广告项目", client: "新客户", format: "9:16",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      script: "在这里写下创意、旁白或完整脚本。", createdAt: new Date().toISOString(), shots: [],
    };
    void persist({ ...workspace, projects: [newProject, ...workspace.projects], activeProjectId: newProject.id });
    setColumnSettings(defaultColumns);
    setScreen("project"); setTab("分镜制作");
  }

  async function handleFileImport(file: File, target: "new" | "current") {
    setIsImporting(true);
    setToast("正在解析分镜表格…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "x-access-key": accessKey },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "导入分镜表格失败");
      }
      const data = await res.json() as {
        success: boolean;
        projectName: string;
        shots: Shot[];
        columnSettings: ColumnSetting[];
      };
      if (!data.shots || data.shots.length === 0) {
        throw new Error("表格中未找到分镜镜头数据");
      }

      if (target === "new" || !project || project.shots.length === 0) {
        const newProj: Project = {
          id: uid("project"),
          name: data.projectName || file.name.replace(/\.[^/.]+$/, ""),
          client: "ulefone",
          format: "16:9",
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          script: `${data.projectName} 广告分镜`,
          createdAt: new Date().toISOString(),
          columnSettings: data.columnSettings?.length ? data.columnSettings : defaultColumns,
          shots: data.shots,
        };
        const nextProjects = [newProj, ...workspace.projects];
        await persist({ ...workspace, projects: nextProjects, activeProjectId: newProj.id });
        setColumnSettings(newProj.columnSettings || defaultColumns);
        setScreen("project");
        setTab("分镜制作");
        setToast(`已成功导入项目 “${newProj.name}”（共 ${newProj.shots.length} 个镜头）`);
      } else {
        setImportModalData(data);
      }
    } catch (err: any) {
      alert(err.message || "导入分镜表格失败");
    } finally {
      setIsImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
      if (projectExcelInputRef.current) projectExcelInputRef.current.value = "";
    }
  }

  function handleAppendImportedShots() {
    if (!importModalData || !project) return;
    const currentCount = project.shots.length;
    const renumberedShots = importModalData.shots.map((shot, idx) => ({
      ...shot,
      id: uid("shot"),
      no: currentCount + idx + 1,
    }));
    const updatedShots = [...project.shots, ...renumberedShots];
    updateProject({ shots: updatedShots });
    setToast(`已成功追加 ${renumberedShots.length} 个镜头`);
    setImportModalData(null);
  }

  function handleReplaceProjectShots() {
    if (!importModalData || !project) return;
    updateProject({
      shots: importModalData.shots,
      columnSettings: importModalData.columnSettings?.length ? importModalData.columnSettings : columnSettings,
    });
    if (importModalData.columnSettings?.length) {
      setColumnSettings(importModalData.columnSettings);
    }
    setToast(`已更新当前分镜，共 ${importModalData.shots.length} 个镜头`);
    setImportModalData(null);
  }

  function handleCreateAsNewFromModal() {
    if (!importModalData) return;
    const newProj: Project = {
      id: uid("project"),
      name: importModalData.projectName || "新导入分镜项目",
      client: "ulefone",
      format: "16:9",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      script: `${importModalData.projectName} 广告分镜`,
      createdAt: new Date().toISOString(),
      columnSettings: importModalData.columnSettings?.length ? importModalData.columnSettings : defaultColumns,
      shots: importModalData.shots,
    };
    const nextProjects = [newProj, ...workspace.projects];
    void persist({ ...workspace, projects: nextProjects, activeProjectId: newProj.id });
    setColumnSettings(newProj.columnSettings || defaultColumns);
    setScreen("project");
    setTab("分镜制作");
    setToast(`已作为新项目导入 “${newProj.name}”（共 ${newProj.shots.length} 个镜头）`);
    setImportModalData(null);
  }

  function handleCreateGroup() {
    const name = prompt("请输入新建项目组名称", "广告分镜组");
    if (!name?.trim()) return;
    setToast(`已创建项目组 “${name.trim()}”`);
  }

  function deleteProject(id: string) {
    if (!confirm("确定将这个项目移入回收站吗？")) return;
    const projectsLeft = workspace.projects.filter((p) => p.id !== id);
    void persist({ ...workspace, projects: projectsLeft, activeProjectId: projectsLeft[0]?.id || "" });
    setProjectMenu(null);
  }

  function duplicateProject(item: Project) {
    const copy: Project = {
      ...item, id: uid("project"), name: `${item.name} - 副本`, createdAt: new Date().toISOString(),
      shots: item.shots.map((shot, index) => ({ ...shot, id: uid("shot"), no: index + 1 })),
      notices: (item.notices || []).map((notice) => ({ ...notice, id: uid("notice") })),
    };
    void persist({ ...workspace, projects: [copy, ...workspace.projects] });
    setProjectMenu(null); setToast("项目已复制");
  }

  function addShot(afterId?: string) {
    if (!project) return;
    const shot: Shot = {
      id: uid("shot"), no: 1, scene: "",
      title: "", description: "", shotSize: "", movement: "",
      duration: 0, dialogue: "", status: "待拍摄", color: "#e8eceb", note: "", image: "", customFields: {},
    };
    const shots = [...project.shots];
    const index = afterId === "before-first" ? 0 : afterId ? shots.findIndex((s) => s.id === afterId) + 1 : shots.length;
    shots.splice(index, 0, shot);
    updateProject({ shots: shots.map((s, i) => ({ ...s, no: i + 1 })) });
    setEditingShot(shot.id);
  }

  function addShots(count: number) {
    if (!project) return;
    const base = project.shots.length;
    const additions = Array.from({ length: count }, (_, index): Shot => ({
      id: uid(`shot-${index}`), no: base + index + 1,
      scene: "", title: "", description: "",
      shotSize: "", movement: "", duration: 0, dialogue: "",
      status: "待拍摄", color: "#e8eceb", note: "", image: "", customFields: {},
    }));
    updateProject({ shots: [...project.shots, ...additions] });
    setNewMenu(false); setToast(`已创建 ${count} 个分镜`);
  }

  function deleteShot(id: string) {
    if (!project || !confirm("删除这个镜头？")) return;
    updateProject({ shots: project.shots.filter((s) => s.id !== id).map((s, i) => ({ ...s, no: i + 1 })) });
  }

  function deleteSelectedShots() {
    if (!project || !selectedShotIds.length || !confirm(`删除选中的 ${selectedShotIds.length} 个镜头？`)) return;
    updateProject({ shots: project.shots.filter((s) => !selectedShotIds.includes(s.id)).map((s, i) => ({ ...s, no: i + 1 })) });
    setSelectedShotIds([]); setToast("已删除选中镜头");
  }

  function reorderShots(sourceId: string, targetId: string, position: "before" | "after" = "after") {
    if (!project || !sourceId || sourceId === targetId) return;
    const shots = [...project.shots];
    const sourceIdx = shots.findIndex((s) => s.id === sourceId);
    const targetIdx = shots.findIndex((s) => s.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = shots.splice(sourceIdx, 1);
    const newTargetIdx = shots.findIndex((s) => s.id === targetId);
    const insertIdx = position === "after" ? newTargetIdx + 1 : newTargetIdx;
    shots.splice(insertIdx, 0, moved);

    updateProject({ shots: shots.map((s, idx) => ({ ...s, no: idx + 1 })) });
    setDragId("");
    setDropTargetId("");
    setDropPosition(null);
    if (typeof document !== "undefined") {
      document.body.classList.remove("is-dragging-shot");
    }
    setToast(`镜头顺序已更新（镜头 ${moved.no} 移至第 ${insertIdx + 1} 位）`);
  }

  function startShotDrag(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDragId(id);
    if (typeof document !== "undefined") {
      document.body.classList.add("is-dragging-shot");
    }
  }

  function reorder(targetId?: string, targetScene?: string) {
    if (!project || !dragId || dragId === targetId) return;
    const shots = [...project.shots];
    const from = shots.findIndex((shot) => shot.id === dragId);
    if (from < 0) return;
    const [moved] = shots.splice(from, 1);
    if (targetScene !== undefined) moved.scene = targetScene;
    if (targetId) {
      const newTargetIndex = shots.findIndex((shot) => shot.id === targetId);
      const insertIndex = newTargetIndex < 0 ? shots.length : (from < newTargetIndex ? newTargetIndex + 1 : newTargetIndex);
      shots.splice(insertIndex, 0, moved);
    } else if (targetScene !== undefined) {
      const lastSceneIndex = shots.reduce((last, shot, index) => shot.scene === targetScene ? index : last, -1);
      shots.splice(lastSceneIndex + 1, 0, moved);
    } else {
      shots.push(moved);
    }
    updateProject({ shots: shots.map((shot, index) => ({ ...shot, no: index + 1 })) });
    setDragId(""); setDropTargetId(""); setDropPosition(null);
    if (typeof document !== "undefined") {
      document.body.classList.remove("is-dragging-shot");
    }
    setToast(targetScene !== undefined ? `镜头已移至“${targetScene || "未规划镜头"}”` : "镜头顺序已更新");
  }

  function endShotDrag() {
    setDragId("");
    setDropTargetId("");
    setDropPosition(null);
    if (typeof document !== "undefined") {
      document.body.classList.remove("is-dragging-shot");
    }
  }

  function applyImageFile(file: File, shotId: string, successText = "图片已添加") {
    if (!file.type.startsWith("image/")) return setToast("请选择图片文件");
    if (file.size > 5_000_000) return setToast("图片请控制在 5MB 以内");
    const reader = new FileReader();
    reader.onload = () => {
      updateShot(shotId, { image: String(reader.result) });
      setSelectedImageId(shotId);
      setToast(successText);
    };
    reader.readAsDataURL(file);
  }

  function uploadImage(event: ChangeEvent<HTMLInputElement>, shotId: string) {
    const file = event.target.files?.[0]; if (!file) return;
    applyImageFile(file, shotId);
    event.target.value = "";
  }

  function dropImage(event: DragEvent, shotId: string) {
    event.preventDefault();
    event.stopPropagation();
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith("image/"));
    if (file) applyImageFile(file, shotId, "图片已拖入");
  }

  function imageFor(shot: Shot) {
    if (shot.image !== undefined) return shot.image || blankImage;
    const match = shot.id.match(/\d+/);
    const index = match ? parseInt(match[0], 10) - 1 : 0;
    return fallbackImages[Math.max(0, index) % fallbackImages.length];
  }

  function createNoticeDraft() {
    setNoticeDraft({
      id: uid("notice"), title: "拍摄", date: project?.dueDate || new Date().toISOString().slice(0, 10),
      firstRoll: "", location: "", weather: "", note: "", status: "待执行",
      people: [
        { role: "导演 Director", name: "" }, { role: "摄影 DOP", name: "" },
        { role: "制片 Producer", name: "" }, { role: "联系人 Contact", name: "" },
      ],
    });
    setNoticeStep(1);
  }

  function saveNotice(exit = false) {
    if (!project || !noticeDraft) return;
    const notices = [...(project.notices || [])];
    const index = notices.findIndex((item) => item.id === noticeDraft.id);
    if (index >= 0) notices[index] = noticeDraft; else notices.push(noticeDraft);
    updateProject({ notices });
    setToast("拍摄通告已保存");
    if (exit) setNoticeDraft(null);
  }

  async function exportCurrent() {
    if (!project || exporting) return;
    setExporting(true);
    try {
      const format = exportFormat === "Excel 文件" ? "xlsx" : "pdf";
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-key": accessKey },
        body: JSON.stringify({
          format,
          exportType,
          fontSize: fontSizeSetting,
          maxColumns,
          brandLogo,
          headerColor,
          columns: visibleColumnSettings,
          project: {
            ...project,
            client: brandLogo || project.client || "ulefone",
            shots: project.shots.map((shot) => ({ ...shot, image: imageFor(shot) })),
          },
        }),
      });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.name}-${exportType}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setToast(`${format === "xlsx" ? "Excel" : "PDF"} 文件已导出`);
    } catch {
      setToast("导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }

  const renderTemplateModals = () => (
    <>
      {showTemplatesLibraryModal && (
        <div
          className="template-lib-overlay"
          onClick={() => {
            setShowTemplatesLibraryModal(false);
            setTemplateMenuId(null);
          }}
        >
          <section className="template-lib-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="template-lib-header">
              <h2>模板库</h2>
              <button
                type="button"
                className="template-lib-close"
                onClick={() => setShowTemplatesLibraryModal(false)}
                title="关闭"
              >
                <X weight="bold" size={20} />
              </button>
            </header>
            <div className="template-cards-row">
              {[...builtinTemplates, ...(workspace.columnTemplates || [])].map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                const isBuiltin = builtinTemplates.some((b) => b.id === tmpl.id);
                const colNames = ["镜号", ...tmpl.columns.filter((c) => c.visible).map((c) => c.label)];
                return (
                  <article
                    key={tmpl.id}
                    className={`template-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setTemplateMenuId(null);
                    }}
                  >
                    <header className="tmpl-card-header">
                      <div className="tmpl-title-wrap">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="7" height="16" rx="1.5" />
                          <rect x="14" y="4" width="7" height="16" rx="1.5" />
                        </svg>
                        <span className="tmpl-card-name" title={tmpl.name}>{tmpl.name}</span>
                      </div>
                      <button
                        type="button"
                        className="tmpl-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateMenuId(templateMenuId === tmpl.id ? null : tmpl.id);
                        }}
                        title="更多操作"
                      >
                        <DotsThree weight="bold" size={18} />
                      </button>
                    </header>

                    {templateMenuId === tmpl.id && (
                      <div className="tmpl-card-menu-popover" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setTemplateMenuId(null);
                            applyColumnTemplateObj(tmpl);
                          }}
                        >
                          <Check size={14} /> 设为当前模板
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateTemplate(tmpl)}
                        >
                          <Copy size={14} /> 复制模板
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTemplateMenuId(null);
                            setEditingTemplate({ ...tmpl, columns: tmpl.columns.map((c) => ({ ...c })) });
                          }}
                        >
                          <PencilSimple size={14} /> 编辑列设置
                        </button>
                        {!isBuiltin && (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                          >
                            <Trash size={14} /> 删除模板
                          </button>
                        )}
                      </div>
                    )}

                    <div className="tmpl-columns-box">
                      {colNames.map((cName, idx) => (
                        <div key={`${tmpl.id}-${cName}-${idx}`} className="tmpl-column-item">
                          <span className="tmpl-column-dot" />
                          <span>{cName}</span>
                        </div>
                      ))}
                    </div>

                    <div className="tmpl-card-footer">
                      <button
                        type="button"
                        className="tmpl-use-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          applyColumnTemplateObj(tmpl);
                        }}
                      >
                        使用
                      </button>
                      <button
                        type="button"
                        className="tmpl-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate({ ...tmpl, columns: tmpl.columns.map((c) => ({ ...c })) });
                        }}
                      >
                        编辑
                      </button>
                    </div>
                  </article>
                );
              })}

              <button
                type="button"
                className="tmpl-add-card"
                onClick={() => {
                  setNewTemplateName(project ? `${project.name}分镜模板` : "新自定义分镜模板");
                  setShowNewTemplateModal(true);
                }}
                title="新建或从当前配置保存为新模板"
              >
                <Plus size={28} weight="bold" />
              </button>
            </div>
          </section>
        </div>
      )}

      {showNewTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowNewTemplateModal(false)}>
          <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>新建分镜模板</h2>
              <button onClick={() => setShowNewTemplateModal(false)}><X /></button>
            </header>
            <label>
              模板名称
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="例如：短视频分镜 / 广告大片"
                autoFocus
              />
            </label>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "10px 0 16px" }}>
              将以当前分镜的列配置（共 {visibleColumnSettings.length} 列）创建新模板，并在模板库中持久保存。
            </p>
            <div className="modal-actions">
              <button className="pill-button" onClick={() => setShowNewTemplateModal(false)}>取消</button>
              <button className="yellow-btn" onClick={handleSaveNewTemplate}>创建模板</button>
            </div>
          </section>
        </div>
      )}

      {editingTemplate && (
        <div className="modal-overlay" onClick={() => setEditingTemplate(null)}>
          <section className="edit-modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>编辑模板：{editingTemplate.name}</h2>
              <button onClick={() => setEditingTemplate(null)}><X /></button>
            </header>
            <label style={{ margin: "12px 0 16px" }}>
              模板名称
              <input
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              />
            </label>
            <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px", color: "#334155" }}>包含的列</h4>
            <div style={{ display: "grid", gap: "8px", maxHeight: "280px", overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b" }}>
                <span className="tmpl-column-dot" /> <span>镜号（固定首列）</span>
              </div>
              {editingTemplate.columns.map((c, idx) => (
                <label key={c.key} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", margin: 0, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={c.visible}
                    onChange={(e) => {
                      const next = editingTemplate.columns.map((col, i) => (i === idx ? { ...col, visible: e.target.checked } : col));
                      setEditingTemplate({ ...editingTemplate, columns: next });
                    }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button className="pill-button" onClick={() => setEditingTemplate(null)}>取消</button>
              <button className="yellow-btn" onClick={handleSaveEditedTemplate}>保存模板</button>
            </div>
          </section>
        </div>
      )}
    </>
  );

  if (loading) return <main className="loading-page"><div className="flash-logo"><MediaStoryLogo /></div><p>正在打开 MediaStory…</p></main>;

  if (!accessKey) return (
    <main className="login-page">
      <section className="login-card">
        <div className="flash-logo"><MediaStoryLogo /></div>
        <p className="brand-kicker">MEDIASTORY</p><h1>让创意落到每一个镜头</h1>
        <p className="muted">短视频与广告团队的前期制作工作台</p>
        <form onSubmit={(e) => { e.preventDefault(); void loadWorkspace(keyInput); }}>
          <label>团队访问口令<input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="请输入团队口令（默认：wangwenzhi）" autoFocus /></label>
          {loginError && <p className="error">{loginError}</p>}
          <button className="yellow-btn wide" type="submit">进入工作台</button>
        </form>
      </section>
    </main>
  );

  if (screen === "projects") return (
    <main className="projects-shell">
      <aside className="project-rail">
        <div className="bolt-brand"><div className="flash-logo"><MediaStoryLogo dotColor="#18181B" /></div></div>
        <nav>
          <button className="active"><FolderOpen weight="fill" /><span>项目</span></button>
          <button><UsersThree /><span>联系人</span></button>
        </nav>
        <button className="account-button"><div className="flash-logo small"><MediaStoryLogo /></div><span>我的账号</span></button>
      </aside>
      <section className="projects-main">
        <header className="projects-top">
          <div><h1>我的项目</h1><p>排序&nbsp;&nbsp;<b>最近编辑</b></p></div>
          <div className="projects-actions">
            <label className="search-box"><MagnifyingGlass /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目名…" /></label>
            <button className="pill-button" onClick={() => setShowTemplatesLibraryModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, flexShrink: 0 }}>
                <rect x="3" y="4" width="7" height="16" rx="2"/>
                <rect x="14" y="4" width="7" height="16" rx="2"/>
              </svg>
              {workspace.columnTemplates?.length ? `0${workspace.columnTemplates.length + 3} ` : ""}模板
            </button>
            <button className="round-button"><Bell /></button>
          </div>
        </header>
        <div className="project-grid">
          <article className="folder-card new-project-card">
            <button className="new-project" onClick={() => setNewProjectMenu(!newProjectMenu)}>
              <div><Plus /></div>
              <b>创建新项目 / ...</b>
              <span>从空白或表格导入</span>
            </button>
            {newProjectMenu && (
              <div className="mini-menu create-project-menu" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setNewProjectMenu(false); addProject(); }}>
                  <FilmSlate weight="bold" /> 创建项目
                </button>
                <button onClick={() => { setNewProjectMenu(false); handleCreateGroup(); }}>
                  <Folder weight="bold" /> 创建组
                </button>
                <button onClick={() => { setNewProjectMenu(false); excelInputRef.current?.click(); }}>
                  <FileArrowDown weight="bold" /> 导入Excel
                </button>
              </div>
            )}
          </article>
          {projects.map((item) => (
            <article className="folder-card" key={item.id}>
              <button className="folder-open" onClick={() => openProject(item.id)}>
                <StoryboardFolderVisual count={item.shots.length} />
                <h3>{item.name}</h3>
                <small>{formatProjectDate(item.createdAt)}</small>
              </button>
              <button className="card-menu" onClick={() => setProjectMenu(projectMenu === item.id ? null : item.id)}><DotsThree weight="bold" /></button>
              {projectMenu === item.id && <div className="mini-menu project-card-menu">
                <button onClick={() => { setEditingProject({ ...item }); setProjectMenu(null); }}><PencilSimple /> 修改项目名称和标志</button>
                <button onClick={() => duplicateProject(item)}><Copy /> 复制分镜到新项目</button>
                <button className="danger" onClick={() => deleteProject(item.id)}><Trash /> 移入回收站</button>
              </div>}
            </article>
          ))}
        </div>
        <button className="floating-help">?</button>
      </section>
      {editingProject && <div className="modal-overlay" onClick={() => setEditingProject(null)}>
        <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
          <header><h2>修改项目</h2><button onClick={() => setEditingProject(null)}><X /></button></header>
          <label>项目名称<input value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} /></label>
          <label>客户 / 品牌<input value={editingProject.client} onChange={(e) => setEditingProject({ ...editingProject, client: e.target.value })} /></label>
          <div className="modal-actions"><button className="pill-button" onClick={() => setEditingProject(null)}>取消</button><button className="yellow-btn" onClick={() => { void persist({ ...workspace, projects: workspace.projects.map((p) => p.id === editingProject.id ? editingProject : p) }); setEditingProject(null); }}>确认</button></div>
        </section>
      </div>}
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileImport(file, "new");
        }}
      />
      {renderTemplateModals()}
    </main>
  );

  if (!project) return <main className="loading-page"><button className="yellow-btn" onClick={() => setScreen("projects")}>返回项目</button></main>;

  const previewPage = (content: ReactNode, pageNumber: number, totalPages: number) => (
    <article className="print-page a4-landscape" key={`${exportType}-${pageNumber}`}>
      <span className="paper-label">A4 横向 · 第 {pageNumber}/{totalPages} 页</span>
      <header><div><h1>{project.name}</h1></div><div className="print-brand"><b>{brandLogo || project.client || "ulefone"}</b><span className="print-meta">画幅比 {project.format || "16:9"} ｜ 总镜头数 {project.shots.length}个 ｜ 总时长 {totalDuration}秒</span></div></header>
      <div className="print-page-content">{content}</div>
      <footer><b>{brandLogo || project.client || "ulefone"}</b><span>{project.name} · 分镜 · {pageNumber}</span></footer>
    </article>
  );

  if (screen === "export") return (
    <main className="export-screen">
      <aside className="export-sidebar">
        <header><button onClick={() => setScreen("project")}><ArrowLeft /></button><h2>导出预览</h2></header>
        <section><h3>内容选择</h3>{["分镜", "故事板", "拍摄计划", "拍摄通告"].map((type) => <label className="radio-row" key={type}><input type="radio" checked={exportType === type} onChange={() => setExportType(type)} />{type}</label>)}</section>
        <section>
          <h3>导出设置</h3>
          <select className="format-select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option>PDF 文件</option>
            <option>Excel 文件</option>
          </select>
          <select className="format-select" style={{ marginTop: 8 }} value={orientation === "横" ? "横向排版" : "纵向排版"} onChange={(e) => setOrientation(e.target.value.includes("横") ? "横" : "竖")}>
            <option>横向排版</option>
            <option>纵向排版</option>
          </select>
        </section>
        <section>
          <h3>页面设置</h3>
          <div className="page-settings-grid">
            <label>
              <select value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                <option value="横">横</option>
                <option value="竖">竖</option>
              </select>
              <span>纸张方向</span>
            </label>
            <label>
              <select value={fontSizeSetting} onChange={(e) => setFontSizeSetting(e.target.value as any)}>
                <option value="小">小</option>
                <option value="中">中</option>
                <option value="大">大</option>
              </select>
              <span>文字大小</span>
            </label>
            <label>
              <select value={imageSizeSetting} onChange={(e) => setImageSizeSetting(e.target.value)}>
                <option value="小">小</option>
                <option value="中">中</option>
                <option value="大">大</option>
              </select>
              <span>图片大小</span>
            </label>
            <label>
              <select value={maxColumns} onChange={(e) => setMaxColumns(Number(e.target.value))}>
                <option value={7}>7</option>
                <option value={8}>8</option>
              </select>
              <span>最大列数</span>
            </label>
          </div>
          <div className="custom-brand-row">
            <div className="color-swatch-control">
              <input type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} />
              <span>导航颜色</span>
            </div>
            <div className="logo-select-control">
              <select value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)}>
                <option value="ulefone">ulefone</option>
                <option value="MediaStory">MediaStory</option>
                <option value={project.client || "品牌定制"}>{project.client || "品牌定制"}</option>
              </select>
              <span>LOGO选择</span>
            </div>
          </div>
          <button className="preview-refresh-button" onClick={() => setToast("已应用预览设置")}>
            生成预览
          </button>
        </section>
        <button className="export-action" onClick={exportCurrent} disabled={exporting}>
          <DownloadSimple weight="bold" /> {exporting ? "正在生成…" : "导出"}
        </button>
      </aside>
      <section className={`print-stage ${fontSizeSetting === "大" ? "font-size-lg" : fontSizeSetting === "小" ? "font-size-sm" : "font-size-md"}`}>
        <div className="preview-top-banner">
          导出排版预览（所见即所得：与导出 PDF / Excel 打印排版 100% 一致）
        </div>
        {exportType === "分镜" && storyboardPages.map((shots, pageIndex) => previewPage(<div className={`print-table ${maxColumns === 8 ? "has-props" : ""}`}>
            <div className="print-table-head" style={{ background: headerColor }}>
              <span>镜号</span>
              <span>画面</span>
              <span>景别</span>
              <span>时长 (秒)</span>
              <span>内容</span>
              <span>备注</span>
              <span>卖点</span>
              {maxColumns === 8 && <span>道具</span>}
            </div>
            {shots.map((shot) => {
              const sellingPoint = shot.sellingPoint || shot.customFields?.["卖点"] || shot.customFields?.["sellingPoint"] || "";
              const props = shot.props || shot.customFields?.["道具"] || shot.customFields?.["props"] || "";
              return (
                <div
                  className={`print-table-row ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`}
                  draggable
                  onDragStart={(e) => startShotDrag(e, shot.id)}
                  onDragEnd={endShotDrag}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragId && dragId !== shot.id) setDropTargetId(shot.id);
                  }}
                  onDragLeave={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                      if (dropTargetId === shot.id) setDropTargetId("");
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const activeDragId = dragId || e.dataTransfer.getData("text/plain");
                    if (activeDragId && activeDragId !== shot.id) {
                      reorder(shot.id);
                    } else {
                      endShotDrag();
                    }
                  }}
                  key={shot.id}
                >
                  <b>{shot.no}</b>
                  <div className="print-img-cell">
                    <img src={imageFor(shot)} alt="" />
                  </div>
                  <span>{shot.shotSize || ""}</span>
                  <span>{shot.duration ? shot.duration : ""}</span>
                  <p className="print-content-cell">{shot.description || ""}</p>
                  <p className="print-note-cell">{shot.note || ""}</p>
                  <span>{sellingPoint}</span>
                  {maxColumns === 8 && <span>{props}</span>}
                </div>
              );
            })}
          </div>, pageIndex + 1, storyboardPages.length))}
        {exportType === "故事板" && storyPages.map((shots, pageIndex) => previewPage(<div className="print-grid">{shots.map((shot) => <div key={shot.id} className={`print-shot ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`} draggable onDragStart={() => setDragId(shot.id)} onDragEnd={endShotDrag} onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== shot.id) setDropTargetId(shot.id); }} onDrop={(e) => { e.preventDefault(); reorder(shot.id); }}><img src={imageFor(shot)} alt="" /><div><span>{shot.shotSize || "未设置"}</span><span>{shot.duration || 0}s</span></div><h4>{shot.description || "暂无内容"}</h4><small>镜头 {shot.no}</small></div>)}</div>, pageIndex + 1, storyPages.length))}
        {exportType === "拍摄计划" && planPages.map((blocks, pageIndex) => previewPage(<div className="export-plan">{blocks.map((block) => <section key={`${block.scene}-${block.shots[0]?.id || "empty"}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); reorder(undefined, block.targetScene); }}><header><h2>{block.scene}</h2><span>{project.dueDate} · {block.shots.length}镜 · {block.shots.reduce((sum, shot) => sum + shot.duration, 0)}秒</span></header>{block.shots.map((shot) => <div className={`export-plan-row ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`} draggable onDragStart={() => setDragId(shot.id)} onDragEnd={endShotDrag} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragId && dragId !== shot.id) setDropTargetId(shot.id); }} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); reorder(shot.id, block.targetScene); }} key={shot.id}><b>镜头 {shot.no}</b><img src={imageFor(shot)} alt="" /><p>{shot.description || "暂无内容"}</p><span>{shot.shotSize || "未设置"}</span><span>{shot.status}</span></div>)}</section>)}</div>, pageIndex + 1, planPages.length))}
        {exportType === "拍摄通告" && noticePages.map((notices, pageIndex) => previewPage(<div className="export-notice">{notices.length ? notices.map((notice) => <section key={notice.id}><h2>{notice.title}</h2><div><b>拍摄日期</b><span>{notice.date}</span><b>第一镜时间</b><span>{notice.firstRoll || "待定"}</span><b>地点</b><span>{notice.location || "待定"}</span><b>天气</b><span>{notice.weather || "待定"}</span></div><p>{notice.note}</p></section>) : <p className="empty-export">暂无拍摄通告</p>}</div>, pageIndex + 1, noticePages.length))}
      </section>
    </main>
  );

  return (
    <main className="project-shell">
      <header className="project-header">
        <button className="back-button" onClick={() => setScreen("projects")}><ArrowLeft /></button>
        <input className="project-name" value={project.name} onChange={(e) => updateProject({ name: e.target.value })} />
        <nav className="flow-nav">{flowTabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <div className="project-tools">
          <div className="flash-logo tiny"><MediaStoryLogo /></div>
          <button className="round-button"><Bell /></button>
          <div className="menu-anchor">
            <button
              className="round-button"
              onClick={(e) => {
                e.stopPropagation();
                setTopMoreMenu(!topMoreMenu);
              }}
              title="更多操作"
            >
              <DotsThree weight="bold" />
            </button>
            {topMoreMenu && (
              <div className="action-popover top-more-popover" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    setTopMoreMenu(false);
                    undo();
                  }}
                  disabled={historyIndex <= 0}
                >
                  <ArrowUUpLeft /> <span>撤回</span> <kbd>Ctrl Z</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTopMoreMenu(false);
                    redo();
                  }}
                  disabled={historyIndex >= history.length - 1}
                >
                  <ArrowUUpRight /> <span>重复</span> <kbd>Ctrl ⇧ Z</kbd>
                </button>
                <div className="popover-divider" />
                <button
                  type="button"
                  onClick={() => {
                    setTopMoreMenu(false);
                    saveColumnTemplate();
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="7" height="16" rx="2"/>
                    <rect x="14" y="4" width="7" height="16" rx="2"/>
                  </svg>
                  <span>保存模板</span>
                </button>
              </div>
            )}
          </div>
          <button className="pill-button"><ShareNetwork /> 协作</button>
          <button className="pill-button" onClick={() => setScreen("export")}><Export /> 导出</button>
        </div>
      </header>

      {batchMode && (
        <div className="batch-mode-floating-banner">
          <div className="batch-mode-banner-text">
            <b>已进入批量编辑模式</b>
            <span>请查看页面左下角快捷键说明</span>
          </div>
          <button
            type="button"
            className="batch-mode-exit-btn"
            onClick={() => {
              setBatchMode(false);
              setSelectedCells(new Set());
            }}
          >
            退出
          </button>
        </div>
      )}

      {tab === "分镜制作" && (
        <section className="flow-page">
          {batchMode ? (
            <div className="table-actions-batch">
              <h2 className="batch-mode-heading">批量编辑模式</h2>
            </div>
          ) : (
            <div className="page-toolbar">
              <div>
                <h1>制作分镜 <button className="help-dot">?</button></h1>
                <div className="menu-anchor">
                  <button className="yellow-btn" onClick={() => setNewMenu(!newMenu)}>
                    <Plus weight="bold" /> 新建 <CaretDown />
                  </button>
                  {newMenu && (
                    <div className="action-popover new-shot-menu">
                      <button onClick={() => addShots(1)}><Plus /> 创建分镜</button>
                      <button onClick={() => addShots(5)}><Plus /> 创建5个分镜</button>
                      <button onClick={() => addShots(10)}><Plus /> 创建10个分镜</button>
                      <div className="popover-divider" />
                      <button onClick={() => { setNewMenu(false); projectExcelInputRef.current?.click(); }}>
                        <FileArrowDown /> 导入Excel表格
                      </button>
                    </div>
                  )}
                </div>
                <span className="quick-hint">图片位支持点击上传、拖入或 Ctrl+V 粘贴　Alt+N 新建镜头</span>
              </div>
              <div>
                <span className="save-indicator"><Check weight="bold" /> {saveState}</span>
                <button className="pill-button" onClick={() => projectExcelInputRef.current?.click()} title="导入 Excel (.xlsx) 或 CSV 表格">
                  <FileArrowDown /> 导入Excel
                </button>
                <button
                  className="pill-button"
                  onClick={() => {
                    setBatchMode(true);
                    setSelectedCells(new Set());
                  }}
                >
                  <Rows /> 批量模式
                </button>
                <div className="menu-anchor">
                  <button className="pill-button" onClick={() => setSelectionMenu(!selectionMenu)}>
                    <Check /> 选择 <CaretDown />
                  </button>
                  {selectionMenu && (
                    <div className="action-popover selection-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectionMenu(false);
                          selectEmptyShots();
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3"/>
                          <path d="M12 8v8M8 12h8"/>
                        </svg>
                        选中空镜头
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShotIds(project.shots.map((s) => s.id));
                          setSelectionMenu(false);
                          setToast(`已全选 ${project.shots.length} 个镜头`);
                        }}
                      >
                        <Check weight="bold" /> 全选镜头
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nonEmpties = project.shots.filter((s) => !isEmptyShot(s)).map((s) => s.id);
                          setSelectedShotIds(nonEmpties);
                          setSelectionMenu(false);
                          setToast(`已选中 ${nonEmpties.length} 个已有画面的镜头`);
                        }}
                      >
                        <CirclesFour /> 选中已制作镜头
                      </button>
                      <div className="popover-divider" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShotIds([]);
                          setSelectionMenu(false);
                        }}
                      >
                        <X /> 取消选择
                      </button>
                    </div>
                  )}
                </div>
                <div className="menu-anchor">
                  <button
                    className="pill-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoryboardSettingsMenu(!storyboardSettingsMenu);
                    }}
                  >
                    <SlidersHorizontal /> 分镜设置 <CaretDown />
                  </button>
                  {storyboardSettingsMenu && (
                    <div className="action-popover storyboard-settings-popover" onClick={(e) => e.stopPropagation()}>
                      <div className="popover-section-title">分镜画幅比例</div>
                      <div className="format-pills">
                        {["16:9", "9:16", "4:3", "2.39:1"].map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            className={project.format === fmt ? "pill-item active" : "pill-item"}
                            onClick={() => {
                              updateProject({ format: fmt });
                              setToast(`已设置画幅为 ${fmt}`);
                            }}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                      <div className="popover-divider" />
                      <div className="popover-section-title">套用模板</div>
                      <button
                        type="button"
                        onClick={() => {
                          setStoryboardSettingsMenu(false);
                          commitColumns(standard7Columns.map((c) => ({ ...c })));
                          setToast("已套用 标准7列 模板");
                        }}
                      >
                        标准 7 列
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStoryboardSettingsMenu(false);
                          commitColumns(movie8Columns.map((c) => ({ ...c })));
                          setToast("已套用 影视商业8列 模板");
                        }}
                      >
                        影视商业 8 列
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStoryboardSettingsMenu(false);
                          commitColumns(minimal4Columns.map((c) => ({ ...c })));
                          setToast("已套用 极简4列 模板");
                        }}
                      >
                        极简 4 列
                      </button>
                      {(workspace.columnTemplates || []).map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => {
                            setStoryboardSettingsMenu(false);
                            applyColumnTemplate(tmpl.id);
                            setToast(`已套用模板 “${tmpl.name}”`);
                          }}
                        >
                          ⭐ {tmpl.name}
                        </button>
                      ))}
                      <div className="popover-divider" />
                      <button
                        type="button"
                        onClick={() => {
                          setStoryboardSettingsMenu(false);
                          saveColumnTemplate();
                        }}
                      >
                        <SquaresFour /> 保存当前列为模板…
                      </button>
                    </div>
                  )}
                </div>
                <button className="pill-button" onClick={() => setShowColumnModal(true)}>
                  <Nut weight="bold" /> 列设置
                </button>
              </div>
            </div>
          )}
          <div className="shot-table">
            <div className="table-head" style={{ gridTemplateColumns: tableTemplate }}>
              <span>排序</span>
              <button
                type="button"
                className="head-select-all-btn"
                onClick={() => {
                  if (selectedShotIds.length === project.shots.length) {
                    setSelectedShotIds([]);
                  } else {
                    setSelectedShotIds(project.shots.map((s) => s.id));
                  }
                }}
                title={selectedShotIds.length === project.shots.length ? "取消全选" : "全选镜头"}
              >
                <span className={`circle-checkbox ${selectedShotIds.length === project.shots.length && project.shots.length > 0 ? "checked" : ""}`}>
                  {selectedShotIds.length === project.shots.length && project.shots.length > 0 && <Check weight="bold" />}
                </span>
              </button>
              <span>镜号</span>
              {visibleColumnSettings.map((column) => (
                <div className="col-head-cell" key={column.key}>
                  <span className="col-header-title">{column.label}</span>
                  <button
                    type="button"
                    className="col-menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveColMenu(activeColMenu === column.key ? null : column.key);
                    }}
                    title="列操作"
                  >
                    <CaretDown weight="bold" />
                  </button>
                  {activeColMenu === column.key && (
                    <div className="action-popover col-quick-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveColMenu(null);
                          setEditingCol({ ...column });
                        }}
                      >
                        <PencilSimple /> 编辑列
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveColMenu(null);
                          hideColumn(column.key);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        隐藏列
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="table-head-add">
                <button
                  type="button"
                  className="head-add-column-btn"
                  title="添加新列或设置列"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddColPopover(!showAddColPopover);
                  }}
                >
                  <Plus weight="bold" />
                </button>
                {showAddColPopover && (
                  <div className="action-popover add-col-popover" onClick={(e) => e.stopPropagation()}>
                    <h4>快速添加列</h4>
                    <div className="quick-add-col-inputs">
                      <input
                        placeholder="输入列名称（如：机位、服装等）…"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomCol();
                            setShowAddColPopover(false);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="yellow-btn"
                        onClick={() => {
                          handleAddCustomCol();
                          setShowAddColPopover(false);
                        }}
                      >
                        添加
                      </button>
                    </div>
                    <div className="popover-divider" />
                    <button
                      type="button"
                      className="full-width-text-btn"
                      onClick={() => {
                        setShowAddColPopover(false);
                        setShowColumnModal(true);
                      }}
                    >
                      打开完整列设置面板…
                    </button>
                  </div>
                )}
              </div>
            </div>
            {project.shots.length > 0 && (
              <div className="table-top-insert-line">
                <button
                  type="button"
                  className="insert-shot insert-shot-top"
                  title="在最前面插入新镜头"
                  onClick={() => addShot("before-first")}
                >
                  <Plus weight="bold" />
                </button>
              </div>
            )}
            {project.shots.map((shot, shotIdx) => (
              <div className="table-wrap" key={shot.id}>
                <article
                  className={`shot-row ${shotIdx % 2 === 0 ? "row-even" : "row-odd"} ${
                    selectedShotIds.includes(shot.id) ? "is-selected" : ""
                  } ${dragId === shot.id ? "is-dragging" : ""} ${
                    dropTargetId === shot.id ? (dropPosition === "before" ? "is-drop-before" : "is-drop-after") : ""
                  }`}
                  style={{ gridTemplateColumns: tableTemplate }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragId && dragId !== shot.id) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const midY = rect.top + rect.height / 2;
                      const pos = e.clientY < midY ? "before" : "after";
                      if (dropTargetId !== shot.id || dropPosition !== pos) {
                        setDropTargetId(shot.id);
                        setDropPosition(pos);
                      }
                    }
                  }}
                  onDragLeave={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    if (
                      e.clientX < rect.left ||
                      e.clientX >= rect.right ||
                      e.clientY < rect.top ||
                      e.clientY >= rect.bottom
                    ) {
                      if (dropTargetId === shot.id) {
                        setDropTargetId("");
                        setDropPosition(null);
                      }
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const activeDragId = dragId || e.dataTransfer.getData("text/plain");
                    if (activeDragId && activeDragId !== shot.id) {
                      reorderShots(activeDragId, shot.id, dropPosition || "after");
                    } else {
                      endShotDrag();
                    }
                  }}
                >
                  <div
                    className="drag-col-cell"
                    draggable={!batchMode}
                    onDragStart={(e) => {
                      if (batchMode) return;
                      startShotDrag(e, shot.id);
                    }}
                    onDragEnd={endShotDrag}
                  >
                    <button
                      type="button"
                      className="drag-button"
                      draggable={!batchMode}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        if (batchMode) return;
                        startShotDrag(e, shot.id);
                      }}
                      onDragEnd={endShotDrag}
                      title={batchMode ? "批量编辑模式" : "拖动调整镜头顺序"}
                    >
                      <List weight="bold" />
                    </button>
                  </div>
                  <div className="check-col-cell">
                    <button
                      type="button"
                      className={`row-select-btn ${selectedShotIds.includes(shot.id) ? "is-active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectShot(shot.id);
                      }}
                      title={selectedShotIds.includes(shot.id) ? "取消选中该镜头" : "选中该镜头"}
                    >
                      <span className={`circle-checkbox ${selectedShotIds.includes(shot.id) ? "checked" : ""}`}>
                        {selectedShotIds.includes(shot.id) && <Check weight="bold" />}
                      </span>
                    </button>
                  </div>
                  <b className="shot-no-cell">{shot.no}</b>
                  {visibleColumnSettings.map((column) => {
                    const cellKey = `${shot.id}:::${column.key}`;
                    const isCellSelected = selectedCells.has(cellKey);

                    if (batchMode) {
                      return (
                        <div
                          key={column.key}
                          className={`col-cell-wrap is-batch-cell ${isCellSelected ? "is-selected-cell" : ""}`}
                          onClick={(e) => handleCellClick(shot.id, column.key, e)}
                          onDoubleClick={() => {
                            setSelectedCells(new Set([cellKey]));
                            setBatchInputValue(getCellValue(shot, column.key));
                            setShowBatchInputModal(true);
                          }}
                        >
                          <div className="batch-cell-display">
                            {column.key === "image" ? (
                              <div className="batch-image-slot">
                                {shot.image ? (
                                  <img src={imageFor(shot)} alt="" />
                                ) : (
                                  <div className="batch-empty-img">
                                    <Plus weight="bold" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="batch-text-slot">
                                {getCellValue(shot, column.key) ? (
                                  <span>{getCellValue(shot, column.key)}</span>
                                ) : (
                                  <span className="batch-empty-placeholder">输入{column.label}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    if (column.key === "image") {
                      return (
                        <div key={column.key}>
                          <label
                            className={`row-image ${(hoveredImageId || selectedImageId) === shot.id ? "paste-target" : ""}`}
                            onMouseEnter={() => setHoveredImageId(shot.id)}
                            onMouseLeave={() => setHoveredImageId(null)}
                            onClick={() => setSelectedImageId(shot.id)}
                            onDragOver={(e) => { e.preventDefault(); setHoveredImageId(shot.id); }}
                            onDrop={(e) => dropImage(e, shot.id)}
                            title="点击上传；也可拖入图片或按 Ctrl+V 粘贴"
                          >
                            <img src={imageFor(shot)} alt={`镜头 ${shot.no}`} />
                            <input type="file" accept="image/*" onChange={(e) => uploadImage(e, shot.id)} />
                            <span><UploadSimple weight="bold" /> {shot.image === "" ? "添加图片" : "替换图片"}</span>
                            <small>Ctrl+V</small>
                          </label>
                        </div>
                      );
                    }
                    if (column.key === "shotSize") {
                      return (
                        <div key={column.key}>
                          <select value={shot.shotSize} onChange={(e) => updateShot(shot.id, { shotSize: e.target.value })}>
                            <option value="">请选择</option>
                            {shotSizes.map((x) => <option key={x}>{x}</option>)}
                          </select>
                        </div>
                      );
                    }
                    if (column.key === "duration") {
                      return (
                        <div key={column.key}>
                          <input
                            className="duration-input"
                            type="number"
                            value={shot.duration || ""}
                            min="0"
                            placeholder="0"
                            onChange={(e) => updateShot(shot.id, { duration: Number(e.target.value) })}
                          />
                        </div>
                      );
                    }
                    if (column.key === "content") {
                      return (
                        <div key={column.key}>
                          <textarea
                            placeholder="输入内容"
                            value={shot.description}
                            onChange={(e) => updateShot(shot.id, { description: e.target.value })}
                          />
                        </div>
                      );
                    }
                    if (column.key === "note") {
                      return (
                        <div key={column.key}>
                          <textarea
                            placeholder="输入备注"
                            value={shot.note || ""}
                            onChange={(e) => updateShot(shot.id, { note: e.target.value })}
                          />
                        </div>
                      );
                    }
                    if (column.key === "sellingPoint") {
                      const val = shot.sellingPoint ?? shot.customFields?.["卖点"] ?? shot.customFields?.["sellingPoint"] ?? "";
                      return (
                        <div key={column.key}>
                          <textarea
                            placeholder="输入卖点"
                            value={val}
                            onChange={(e) => updateShot(shot.id, {
                              sellingPoint: e.target.value,
                              customFields: { ...(shot.customFields || {}), [column.key]: e.target.value, 卖点: e.target.value }
                            })}
                          />
                        </div>
                      );
                    }
                    if (column.key === "props") {
                      const val = shot.props ?? shot.customFields?.["道具"] ?? shot.customFields?.["props"] ?? "";
                      return (
                        <div key={column.key}>
                          <textarea
                            placeholder="输入道具"
                            value={val}
                            onChange={(e) => updateShot(shot.id, {
                              props: e.target.value,
                              customFields: { ...(shot.customFields || {}), [column.key]: e.target.value, 道具: e.target.value }
                            })}
                          />
                        </div>
                      );
                    }
                    if (column.key === "scene") {
                      return (
                        <div key={column.key}>
                          <input
                            placeholder="输入场景"
                            value={shot.scene}
                            onChange={(e) => updateShot(shot.id, { scene: e.target.value })}
                          />
                        </div>
                      );
                    }
                    return (
                      <div key={column.key}>
                        <textarea
                          placeholder={`输入${column.label}`}
                          value={shot.customFields?.[column.key] || ""}
                          onChange={(e) => updateShot(shot.id, {
                            customFields: { ...(shot.customFields || {}), [column.key]: e.target.value }
                          })}
                        />
                      </div>
                    );
                  })}
                  <div className="row-actions">
                    <button title="编辑镜头详情" onClick={() => setEditingShot(shot.id)}><PencilSimple /></button>
                    <button className="danger-btn" title="删除镜头" onClick={() => deleteShot(shot.id)}><Trash /></button>
                  </div>
                </article>
                <button className="insert-shot" title="在此插入新镜头" onClick={() => addShot(shot.id)}><Plus weight="bold" /></button>
              </div>
            ))}
            {!project.shots.length && <button className="empty-table" onClick={() => addShot()}><Plus weight="bold" /> 添加第一个镜头</button>}
          </div>
          {!batchMode && <div className="table-summary">镜头总数 {project.shots.length}　 总时长 {totalDuration} 秒</div>}
        </section>
      )}

      {tab === "故事板" && (
        <section className="flow-page soft-bg">
          <div className="page-toolbar"><div><h1>预览故事版 <button className="help-dot">?</button></h1><button className="yellow-btn" onClick={() => addShot()}><Plus /> 新建镜头</button><span className="quick-hint">拖动卡片右上角抓手调整顺序</span></div><div><button className="pill-button"><CirclesFour /> 显示设置</button><button className="pill-button"><Play /> 放映模式</button></div></div>
          <div className="story-grid">{project.shots.map((shot) => <article
            className={`story-card ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`}
            key={shot.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragId && dragId !== shot.id && dropTargetId !== shot.id) {
                setDropTargetId(shot.id);
              }
            }}
            onDragLeave={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (
                e.clientX < rect.left ||
                e.clientX >= rect.right ||
                e.clientY < rect.top ||
                e.clientY >= rect.bottom
              ) {
                if (dropTargetId === shot.id) setDropTargetId("");
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              const activeDragId = dragId || e.dataTransfer.getData("text/plain");
              if (activeDragId && activeDragId !== shot.id) {
                reorder(shot.id);
              } else {
                endShotDrag();
              }
            }}
          ><button
              type="button"
              className="card-drag-handle"
              draggable
              onDragStart={(e) => startShotDrag(e, shot.id)}
              onDragEnd={endShotDrag}
              title="拖动调整镜头顺序"
            ><DotsSixVertical /></button><img src={imageFor(shot)} alt="" /><div className="story-tags"><span>{shot.shotSize || "未设置"}</span><span>{shot.duration || 0}s</span></div><h3>{shot.description || "暂无内容"}</h3><footer><span>镜头 {shot.no}</span><button title="编辑镜头" onClick={() => setEditingShot(shot.id)}><PencilSimple /></button></footer></article>)}</div>
        </section>
      )}

      {tab === "拍摄计划" && (
        <section className="flow-page soft-bg">
          <div className="page-toolbar"><div><h1>制定拍摄计划 <button className="help-dot">?</button></h1><button className="yellow-btn" onClick={() => setToast("已根据场景整理镜头")}><Plus /> 新建拍摄计划</button><span className="quick-hint">可拖动排序，也可拖到其他场景</span></div><button className="pill-button"><SquaresFour /> 显示设置</button></div>
          <div className="plan-board">
            {!sceneGroups.length && <article className="plan-column unplanned"><div className="plan-empty"><ImageSquare /><b>新建镜头后可在这里安排拍摄</b></div></article>}
            {sceneGroups.map(([scene, shots]) => <article
              className={`plan-column ${dropTargetId === `scene:${scene}` ? "is-drop-target" : ""}`}
              key={scene}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragId && dropTargetId !== `scene:${scene}`) setDropTargetId(`scene:${scene}`);
              }}
              onDragLeave={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (
                  e.clientX < rect.left ||
                  e.clientX >= rect.right ||
                  e.clientY < rect.top ||
                  e.clientY >= rect.bottom
                ) {
                  if (dropTargetId === `scene:${scene}`) setDropTargetId("");
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                reorder(undefined, scene === "未规划镜头" ? "" : scene);
              }}
            ><header><div><h2>{scene}</h2><p><Clock /> {project.dueDate} · {shots.reduce((sum, s) => sum + s.duration, 0)} 秒</p></div><span>{shots.length}</span><button title="编辑场景名称"><PencilSimple /></button></header><div className="plan-list">{shots.map((shot) => <div
              className={`plan-shot ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`}
              key={shot.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                if (dragId && dragId !== shot.id && dropTargetId !== shot.id) setDropTargetId(shot.id);
              }}
              onDragLeave={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (
                  e.clientX < rect.left ||
                  e.clientX >= rect.right ||
                  e.clientY < rect.top ||
                  e.clientY >= rect.bottom
                ) {
                  if (dropTargetId === shot.id) setDropTargetId("");
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const activeDragId = dragId || e.dataTransfer.getData("text/plain");
                if (activeDragId && activeDragId !== shot.id) {
                  reorder(shot.id, scene === "未规划镜头" ? "" : scene);
                } else {
                  endShotDrag();
                }
              }}
            ><button
                type="button"
                className="plan-drag-handle"
                draggable
                onDragStart={(e) => startShotDrag(e, shot.id)}
                onDragEnd={endShotDrag}
                title="拖动排序或移动到其他场景"
              ><DotsSixVertical /></button><input type="checkbox" checked={shot.status === "已完成"} onChange={(e) => updateShot(shot.id, { status: e.target.checked ? "已完成" : "待拍摄" })} /><img src={imageFor(shot)} alt="" /><div><small>镜头 {shot.no}</small><b>{shot.description || "暂无内容"}</b></div><button className="plan-edit-button" title="编辑镜头" onClick={() => setEditingShot(shot.id)}><PencilSimple /></button></div>)}</div></article>)}
          </div>
        </section>
      )}

      {tab === "拍摄通告" && (
        <section className="flow-page notice-page">
          <div className="page-toolbar"><div><h1>发布拍摄通告 <button className="help-dot">?</button></h1></div></div>
          <button className="create-notice" onClick={createNoticeDraft}><span><Plus /></span>创建通告</button>
          <h2 className="notice-section">待执行 <span>{(project.notices || []).filter((n) => n.status === "待执行").length}</span></h2>
          <div className="notice-grid">{(project.notices || []).filter((n) => n.status === "待执行").map((notice) => <article className="notice-summary" key={notice.id}><span className="today-tag">今天</span><h2>{notice.title}</h2><b>待执行</b><div><small>开机日期</small><strong>{new Date(notice.date).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}</strong><span>{new Date(notice.date).getFullYear()}年</span></div><footer><button onClick={() => { setNoticeDraft({ ...notice }); setNoticeStep(1); }}><PencilSimple /> 编辑</button><button className="danger" onClick={() => updateProject({ notices: (project.notices || []).filter((n) => n.id !== notice.id) })}><Trash /> 删除</button></footer></article>)}</div>
          <h2 className="notice-section">已过期 <span>{(project.notices || []).filter((n) => n.status === "已过期").length}</span></h2>
        </section>
      )}

      {noticeDraft && <div className="notice-editor">
        <header><button onClick={() => setNoticeDraft(null)}><ArrowLeft /></button><h2>编辑拍摄通告</h2></header>
        <div className="notice-steps"><span className={noticeStep === 1 ? "active" : ""}><b>1</b> 创建通告</span><span className={noticeStep === 2 ? "active" : ""}><b>2</b> 完善通告</span><span className={noticeStep === 3 ? "active" : ""}><b>3</b> 计划与日程</span></div>
        <div className="notice-form">
          {noticeStep === 1 && <><aside><h3>基本信息</h3><p>建议单天的拍摄计划至少出具一张拍摄通告</p></aside><section>
            <label><i>*</i> 通告标题<input value={noticeDraft.title} onChange={(e) => setNoticeDraft({ ...noticeDraft, title: e.target.value })} /></label>
            <label><i>*</i> 拍摄日期<input type="date" value={noticeDraft.date} onChange={(e) => setNoticeDraft({ ...noticeDraft, date: e.target.value })} /></label>
            <label>第一镜时间<input type="time" value={noticeDraft.firstRoll} onChange={(e) => setNoticeDraft({ ...noticeDraft, firstRoll: e.target.value })} /></label>
            <label>拍摄地点<input value={noticeDraft.location} onChange={(e) => setNoticeDraft({ ...noticeDraft, location: e.target.value })} placeholder="输入拍摄地点" /></label>
            <label>天气<input value={noticeDraft.weather} onChange={(e) => setNoticeDraft({ ...noticeDraft, weather: e.target.value })} placeholder="输入天气信息" /></label>
            <label>备注<textarea value={noticeDraft.note} onChange={(e) => setNoticeDraft({ ...noticeDraft, note: e.target.value })} /></label>
          </section></>}
          {noticeStep === 2 && <><aside><h3>人员信息</h3><p>添加导演、摄影、制片和联系人</p></aside><section className="people-form">{noticeDraft.people.map((person, index) => <div key={`${person.role}-${index}`}><select value={person.role} onChange={(e) => setNoticeDraft({ ...noticeDraft, people: noticeDraft.people.map((p, i) => i === index ? { ...p, role: e.target.value } : p) })}><option>导演 Director</option><option>摄影 DOP</option><option>制片 Producer</option><option>联系人 Contact</option><option>灯光 Gaffer</option></select><input value={person.name} onChange={(e) => setNoticeDraft({ ...noticeDraft, people: noticeDraft.people.map((p, i) => i === index ? { ...p, name: e.target.value } : p) })} placeholder="请输入姓名和电话" /><button onClick={() => setNoticeDraft({ ...noticeDraft, people: noticeDraft.people.filter((_, i) => i !== index) })}><Trash /></button></div>)}<button className="add-person" onClick={() => setNoticeDraft({ ...noticeDraft, people: [...noticeDraft.people, { role: "联系人 Contact", name: "" }] })}><UserPlus /> 添加人员</button></section></>}
          {noticeStep === 3 && <><aside><h3>计划与日程</h3><p>核对分组、演员和拍摄计划</p></aside><section className="call-sheet-preview"><table><tbody><tr><th>拍摄标题</th><td>{noticeDraft.title}</td><th>拍摄日期</th><td>{noticeDraft.date}</td></tr><tr><th>第一镜时间</th><td>{noticeDraft.firstRoll || "待定"}</td><th>拍摄地点</th><td>{noticeDraft.location || "待定"}</td></tr><tr><th>天气</th><td colSpan={3}>{noticeDraft.weather || "待定"}</td></tr></tbody></table><h3>拍摄计划 Shot Plan</h3>{sceneGroups.map(([scene, shots]) => <div className="schedule-row" key={scene}><b>{scene}</b><span>{shots.length} 镜</span><span>{shots.reduce((sum, s) => sum + s.duration, 0)} 秒</span></div>)}</section></>}
        </div>
        <footer><button className="pill-button" disabled={noticeStep === 1} onClick={() => setNoticeStep(Math.max(1, noticeStep - 1))}>上一步</button><button className="pill-button" onClick={() => saveNotice(true)}>存储并退出</button><button className="pill-button" onClick={() => { saveNotice(); setScreen("export"); setExportType("拍摄通告"); }}>预览和导出</button>{noticeStep < 3 ? <button className="yellow-btn" onClick={() => setNoticeStep(noticeStep + 1)}>下一步</button> : <button className="yellow-btn" onClick={() => saveNotice(true)}>完成</button>}</footer>
      </div>}

      {editingShot && <div className="modal-overlay" onClick={() => setEditingShot(null)}><section className="edit-modal storyboard-edit" onClick={(e) => e.stopPropagation()}>{(() => { const shot = project.shots.find((s) => s.id === editingShot); if (!shot) return null; return <><header><div><h2>故事板编辑</h2><small>镜头 {shot.no}</small></div><button onClick={() => setEditingShot(null)}><X /></button></header>
        <label>画面<div
          className={`modal-images ${selectedImageId === shot.id ? "paste-target" : ""}`}
          onMouseEnter={() => setHoveredImageId(shot.id)}
          onMouseLeave={() => setHoveredImageId(null)}
          onClick={() => setSelectedImageId(shot.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => dropImage(e, shot.id)}
        ><img src={imageFor(shot)} alt="" /><label className="add-image"><Plus /><input type="file" accept="image/*" onChange={(e) => uploadImage(e, shot.id)} /></label><span className="modal-paste-hint">拖入或 Ctrl+V 粘贴图片</span></div></label>
        <div className="form-grid"><label>景别<select value={shot.shotSize} onChange={(e) => updateShot(shot.id, { shotSize: e.target.value })}>{shotSizes.map((x) => <option key={x}>{x}</option>)}</select></label><label>时长（秒）<input type="number" min="1" value={shot.duration} onChange={(e) => updateShot(shot.id, { duration: Number(e.target.value) })} /></label></div>
        <div className="form-grid"><label>卖点<input value={shot.sellingPoint || shot.customFields?.["卖点"] || ""} onChange={(e) => updateShot(shot.id, { sellingPoint: e.target.value, customFields: { ...(shot.customFields || {}), 卖点: e.target.value } })} placeholder="输入卖点（如：外观展示）" /></label><label>道具<input value={shot.props || shot.customFields?.["道具"] || ""} onChange={(e) => updateShot(shot.id, { props: e.target.value, customFields: { ...(shot.customFields || {}), 道具: e.target.value } })} placeholder="输入道具（如：橙色表带手表）" /></label></div>
        <label>内容<textarea value={shot.description} onChange={(e) => updateShot(shot.id, { description: e.target.value })} /></label><label>声音<input value={shot.dialogue} onChange={(e) => updateShot(shot.id, { dialogue: e.target.value })} placeholder="输入对白、旁白或环境声" /></label>
        <div className="modal-actions"><button className="yellow-btn" onClick={() => setEditingShot(null)}>确认</button><button className="pill-button" onClick={() => setEditingShot(null)}>取消</button></div></>; })()}</section></div>}
      {showColumnModal && (
        <div className="modal-overlay" onClick={() => setShowColumnModal(false)}>
          <section className="edit-modal column-settings-modal" onClick={(e) => e.stopPropagation()}>
            <header className="column-modal-header">
              <div>
                <h2>列设置与排版</h2>
                <small>自定义表格展示的列、调整排列顺序及列宽</small>
              </div>
              <button className="modal-close-btn" onClick={() => setShowColumnModal(false)}>
                <X weight="bold" />
              </button>
            </header>

            <div className="column-presets-bar">
              <span>一键预设：</span>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  commitColumns(standard7Columns.map((c) => ({ ...c })));
                  setToast("已应用【标准7列 (Armor 35 Pro)】");
                }}
              >
                标准7列 (Armor 35 Pro)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  commitColumns(movie8Columns.map((c) => ({ ...c })));
                  setToast("已应用【影视全能8列 (含道具)】");
                }}
              >
                影视全能8列 (含道具)
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => {
                  commitColumns(minimal4Columns.map((c) => ({ ...c })));
                  setToast("已应用【极简4列】");
                }}
              >
                极简4列
              </button>
              {(workspace.columnTemplates || []).map((tmpl) => (
                <div key={tmpl.id} className="custom-preset-chip">
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => {
                      applyColumnTemplate(tmpl.id);
                      setToast(`已套用模板 “${tmpl.name}”`);
                    }}
                  >
                    ⭐ {tmpl.name}
                  </button>
                  <button
                    type="button"
                    className="chip-del-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定删除模板 “${tmpl.name}”？`)) {
                        const updated = (workspace.columnTemplates || []).filter((t) => t.id !== tmpl.id);
                        void persist({ ...workspace, columnTemplates: updated });
                        setToast(`已删除模板 “${tmpl.name}”`);
                      }
                    }}
                    title="删除此模板"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="column-settings-list">
              <div className="column-list-header">
                <span>显示</span>
                <span>列名称</span>
                <span>列宽调节</span>
                <span>顺序 / 操作</span>
              </div>
              {columnSettings.map((column, index) => (
                <div className="column-item-row" key={column.key}>
                  <button
                    type="button"
                    className={`col-eye-btn ${column.visible ? "is-visible" : "is-hidden"}`}
                    title={column.visible ? "点击隐藏该列" : "点击显示该列"}
                    onClick={() => updateColumn(column.key, { visible: !column.visible })}
                  >
                    {column.visible ? <Eye weight="bold" /> : <EyeSlash weight="bold" />}
                  </button>
                  <input
                    className="col-title-input"
                    value={column.label}
                    onChange={(e) => updateColumn(column.key, { label: e.target.value })}
                    placeholder="列名称"
                  />
                  <div className="col-width-box">
                    <input
                      type="range"
                      min="60"
                      max="480"
                      step="5"
                      value={column.width}
                      onChange={(e) => updateColumn(column.key, { width: Number(e.target.value) })}
                    />
                    <span className="col-width-num">{column.width}px</span>
                  </div>
                  <div className="col-reorder-actions">
                    <button
                      type="button"
                      className="reorder-arrow-btn"
                      title="上移此列"
                      disabled={index === 0}
                      onClick={() => moveColumnOrder(index, -1)}
                    >
                      <CaretUp weight="bold" />
                    </button>
                    <button
                      type="button"
                      className="reorder-arrow-btn"
                      title="下移此列"
                      disabled={index === columnSettings.length - 1}
                      onClick={() => moveColumnOrder(index, 1)}
                    >
                      <CaretDown weight="bold" />
                    </button>
                    {column.custom && (
                      <button
                        type="button"
                        className="col-delete-btn"
                        title="删除此列"
                        onClick={() => {
                          if (confirm(`确定删除“${column.label}”列吗？`)) {
                            commitColumns(columnSettings.filter((item) => item.key !== column.key));
                          }
                        }}
                      >
                        <Trash weight="bold" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="add-col-section">
              <input
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="输入新自定义列名称（如：机位、配乐、特效要求）"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCol();
                  }
                }}
              />
              <button type="button" className="yellow-btn" onClick={handleAddCustomCol}>
                <Plus weight="bold" /> 添加列
              </button>
            </div>

            <div className="column-modal-footer">
              <button
                type="button"
                className="pill-button"
                onClick={() => {
                  commitColumns(standard7Columns.map((c) => ({ ...c })));
                  setToast("已重置为默认列配置");
                }}
              >
                恢复默认
              </button>
              <button
                type="button"
                className="pill-button"
                onClick={saveColumnTemplate}
              >
                保存为模板
              </button>
              <button
                type="button"
                className="yellow-btn"
                style={{ padding: "0 28px" }}
                onClick={() => setShowColumnModal(false)}
              >
                完成
              </button>
            </div>
          </section>
        </div>
      )}
      {editingCol && (
        <div className="modal-overlay" onClick={() => setEditingCol(null)}>
          <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>编辑列属性</h2>
                <small>调整列名称、宽度与显隐</small>
              </div>
              <button onClick={() => setEditingCol(null)}><X /></button>
            </header>
            <label>
              列名称
              <input
                value={editingCol.label}
                onChange={(e) => setEditingCol({ ...editingCol, label: e.target.value })}
                placeholder="输入列名称"
                autoFocus
              />
            </label>
            <label>
              列宽 (当前: {editingCol.width}px)
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                <input
                  type="range"
                  min={60}
                  max={480}
                  step={5}
                  value={editingCol.width}
                  onChange={(e) => setEditingCol({ ...editingCol, width: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "#ffbe18" }}
                />
                <span style={{ fontSize: "12px", fontWeight: "bold", width: "45px", textAlign: "right" }}>
                  {editingCol.width}px
                </span>
              </div>
            </label>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
              <div>
                {editingCol.custom ? (
                  <button
                    type="button"
                    className="pill-button danger-control"
                    onClick={() => {
                      commitColumns(columnSettings.filter((c) => c.key !== editingCol.key));
                      setToast(`已删除列“${editingCol.label}”`);
                      setEditingCol(null);
                    }}
                  >
                    <Trash /> 删除此列
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => {
                      hideColumn(editingCol.key);
                      setEditingCol(null);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 4 }}>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    隐藏此列
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" className="pill-button" onClick={() => setEditingCol(null)}>取消</button>
                <button
                  type="button"
                  className="yellow-btn"
                  onClick={() => {
                    commitColumns(columnSettings.map((c) => c.key === editingCol.key ? editingCol : c));
                    setToast(`已更新“${editingCol.label}”列设置`);
                    setEditingCol(null);
                  }}
                >
                  保存修改
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {showSaveTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowSaveTemplateModal(false)}>
          <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>保存为分镜模板</h2>
                <small>将当前分镜的列名、宽度、顺序保存为预设模板</small>
              </div>
              <button onClick={() => setShowSaveTemplateModal(false)}><X /></button>
            </header>
            <label>
              模板名称
              <input
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                placeholder="例如：商业短片标准模版、数码评测分镜模版"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    doSaveTemplate();
                  }
                }}
              />
            </label>
            <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", margin: "14px 0", fontSize: "12px", color: "#64748b" }}>
              <b>包含列：</b> {visibleColumnSettings.map((c) => c.label).join(" · ")}
            </div>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="pill-button" onClick={() => setShowSaveTemplateModal(false)}>取消</button>
              <button
                type="button"
                className="yellow-btn"
                onClick={doSaveTemplate}
              >
                保存模板
              </button>
            </div>
          </section>
        </div>
      )}
      {renderTemplateModals()}
      {importModalData && (
        <div className="modal-overlay" onClick={() => setImportModalData(null)}>
          <section className="edit-modal import-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>导入分镜表格</h2>
                <small>已解析：“{importModalData.projectName}”（共 {importModalData.shots.length} 个镜头）</small>
              </div>
              <button onClick={() => setImportModalData(null)}><X /></button>
            </header>
            <p style={{ fontSize: "12px", marginBottom: "14px", color: "#64748b" }}>
              当前分镜已有 {project.shots.length} 个镜头，请选择导入方式：
            </p>
            <div className="import-choices">
              <button className="import-choice-btn" onClick={handleAppendImportedShots}>
                <b>追加到当前分镜末尾</b>
                <span>保留现有镜头，将新导入的 {importModalData.shots.length} 个镜头顺延排在后面（自动重新连续编排镜号）</span>
              </button>
              <button className="import-choice-btn" onClick={handleReplaceProjectShots}>
                <b>覆盖当前分镜镜头</b>
                <span>清空当前分镜的镜头，完全替换为导入的 {importModalData.shots.length} 个镜头与列设置</span>
              </button>
              <button className="import-choice-btn" onClick={handleCreateAsNewFromModal}>
                <b>创建为全新独立项目</b>
                <span>保留当前项目不变，在项目列表中新建并打开“{importModalData.projectName}”</span>
              </button>
            </div>
            <div className="modal-actions">
              <button className="pill-button" onClick={() => setImportModalData(null)}>取消</button>
            </div>
          </section>
        </div>
      )}
      {showBatchInputModal && (
        <div className="modal-overlay" onClick={() => setShowBatchInputModal(false)}>
          <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>批量输入内容</h2>
                <small>将内容统一填入已选中的 {selectedCells.size} 个单元格</small>
              </div>
              <button onClick={() => setShowBatchInputModal(false)}><X /></button>
            </header>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>
                快捷常用景别：
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {["特写", "近景", "中景", "全景", "大全景"].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    className="pill-button"
                    style={{ fontSize: 11.5, padding: "3px 10px" }}
                    onClick={() => {
                      applyBatchInput(sz);
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <label>
              统一输入内容
              <textarea
                rows={3}
                value={batchInputValue}
                onChange={(e) => setBatchInputValue(e.target.value)}
                placeholder="请输入要填入的文本（如内容、备注、时长等）…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    applyBatchInput(batchInputValue);
                  }
                }}
              />
            </label>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="pill-button" onClick={() => setShowBatchInputModal(false)}>取消</button>
              <button
                type="button"
                className="yellow-btn"
                onClick={() => applyBatchInput(batchInputValue)}
              >
                确定应用 ({selectedCells.size})
              </button>
            </div>
          </section>
        </div>
      )}
      {showBatchPasteModal && (
        <div className="modal-overlay" onClick={() => setShowBatchPasteModal(false)}>
          <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>批量粘贴数据</h2>
                <small>支持多行或从 Excel 复制的表格数据</small>
              </div>
              <button onClick={() => setShowBatchPasteModal(false)}><X /></button>
            </header>
            <label style={{ marginTop: 12 }}>
              粘贴数据区域
              <textarea
                rows={5}
                value={batchPasteValue}
                onChange={(e) => setBatchPasteValue(e.target.value)}
                placeholder="请在此按 Ctrl+V 粘贴从 Excel 或记事本复制的数据…"
                autoFocus
              />
            </label>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="pill-button" onClick={() => setShowBatchPasteModal(false)}>取消</button>
              <button
                type="button"
                className="yellow-btn"
                disabled={!batchPasteValue.trim()}
                onClick={() => applyPastedText(batchPasteValue)}
              >
                确认填入
              </button>
            </div>
          </section>
        </div>
      )}
      {batchMode && (
        <>
          <aside className="batch-actions-dock">
            <span className="batch-selected-count">
              已选中{selectedCells.size}个单元格
            </span>
            <button
              type="button"
              className="batch-dock-btn"
              disabled={selectedCells.size === 0}
              onClick={() => {
                setBatchInputValue("");
                setShowBatchInputModal(true);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M7 8h10M12 8v8"/>
              </svg>
              批量输入
            </button>
            <button
              type="button"
              className="batch-dock-btn"
              disabled={selectedCells.size === 0}
              onClick={() => void handleBatchPaste()}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/>
              </svg>
              批量粘贴
            </button>
            <button
              type="button"
              className="batch-dock-btn danger"
              disabled={selectedCells.size === 0}
              onClick={handleBatchClear}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
              清空内容
            </button>
            <button
              type="button"
              className="batch-dock-btn exit"
              onClick={() => {
                setBatchMode(false);
                setSelectedCells(new Set());
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              退出批量编辑
            </button>
          </aside>

          <div className="batch-shortcuts-footer">
            <span className="shortcut-item">
              <kbd>左键</kbd> 单选单元格
            </span>
            <span className="shortcut-item">
              <kbd>⌘ / Ctrl 左键</kbd> 多选/反选单元格
            </span>
            <span className="shortcut-item">
              <kbd>⇧ 左键</kbd> 范围内选择单元格
            </span>
          </div>

          <div className="batch-esc-footer">
            <kbd>ESC</kbd> 退出批量模式
          </div>
        </>
      )}

      {selectedShotIds.length > 0 && !batchMode && (
        <aside className="batch-actions-dock">
          <span className="batch-selected-count">
            已选中{selectedShotIds.length}个项目
          </span>
          <div className="dock-separator" />
          <div className="menu-anchor" style={{ position: "relative" }}>
            <button
              type="button"
              className={`batch-dock-btn ${showMoveMenu ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(!showMoveMenu);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
                <line x1="4" y1="18" x2="20" y2="18"/>
                <circle cx="8" cy="6" r="2" fill="currentColor"/>
                <circle cx="16" cy="12" r="2" fill="currentColor"/>
                <circle cx="10" cy="18" r="2" fill="currentColor"/>
              </svg>
              移动镜头
            </button>
            {showMoveMenu && (
              <div className="action-popover move-shot-popover" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => moveSelectedShots("front")}>
                  移至最前
                </button>
                <div className="popover-divider" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMoveMenu(false);
                    setMoveTargetPosition("1");
                    setShowMovePositionModal(true);
                  }}
                >
                  输入位置
                </button>
                <div className="popover-divider" />
                <button type="button" onClick={() => moveSelectedShots("end")}>
                  移至最后
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="batch-dock-btn"
            onClick={duplicateSelectedShots}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="8" y="8" width="13" height="13" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            复制镜头
          </button>
          <button
            type="button"
            className="batch-dock-btn"
            onClick={() => setShowBatchShotsFillModal(true)}
            title="批量修改选中镜头的内容、景别或时长"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            批量填入
          </button>
          <button
            type="button"
            className="batch-dock-btn danger"
            onClick={deleteSelectedShots}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
            </svg>
            删除镜头
          </button>
          <button
            type="button"
            className="batch-dock-btn exit"
            onClick={() => setSelectedShotIds([])}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            取消选择
          </button>
        </aside>
      )}

      {showMovePositionModal && (
        <div className="modal-overlay" onClick={() => setShowMovePositionModal(false)}>
          <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>移动镜头到指定位置</h2>
                <small>将选中的 {selectedShotIds.length} 个镜头移动到指定镜号前</small>
              </div>
              <button onClick={() => setShowMovePositionModal(false)}><X /></button>
            </header>
            <label style={{ marginTop: 14 }}>
              目标镜号 (1 - {project.shots.length})
              <input
                type="number"
                min={1}
                max={project.shots.length}
                value={moveTargetPosition}
                onChange={(e) => setMoveTargetPosition(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    moveSelectedShots("position", Number(moveTargetPosition) || 1);
                  }
                }}
              />
            </label>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="pill-button" onClick={() => setShowMovePositionModal(false)}>取消</button>
              <button
                type="button"
                className="yellow-btn"
                onClick={() => moveSelectedShots("position", Number(moveTargetPosition) || 1)}
              >
                确定移动
              </button>
            </div>
          </section>
        </div>
      )}

      {showBatchShotsFillModal && (
        <div className="modal-overlay" onClick={() => setShowBatchShotsFillModal(false)}>
          <section className="edit-modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>批量填入/编辑镜头</h2>
                <small>已选中 {selectedShotIds.length} 个镜头</small>
              </div>
              <button onClick={() => setShowBatchShotsFillModal(false)}><X /></button>
            </header>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <label>
                统一景别
                <select
                  value={batchFillShotSize}
                  onChange={(e) => setBatchFillShotSize(e.target.value)}
                >
                  <option value="">保持原样（不修改）</option>
                  {shotSizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label>
                统一时长 (秒)
                <input
                  type="number"
                  min={0}
                  placeholder="留空表示不修改时长"
                  value={batchFillDuration}
                  onChange={(e) => setBatchFillDuration(e.target.value)}
                />
              </label>
              <label>
                统一内容描述
                <textarea
                  rows={2}
                  placeholder="留空表示不修改内容"
                  value={batchFillContent}
                  onChange={(e) => setBatchFillContent(e.target.value)}
                />
              </label>
              <label>
                统一备注
                <input
                  placeholder="留空表示不修改备注"
                  value={batchFillNote}
                  onChange={(e) => setBatchFillNote(e.target.value)}
                />
              </label>
            </div>
            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="pill-button" onClick={() => setShowBatchShotsFillModal(false)}>取消</button>
              <button
                type="button"
                className="yellow-btn"
                onClick={() => {
                  const patch: Partial<Shot> = {};
                  if (batchFillShotSize) patch.shotSize = batchFillShotSize;
                  if (batchFillDuration) patch.duration = Number(batchFillDuration) || 0;
                  if (batchFillContent) patch.description = batchFillContent;
                  if (batchFillNote) patch.note = batchFillNote;
                  applyBatchFillToShots(patch);
                }}
              >
                应用修改 ({selectedShotIds.length})
              </button>
            </div>
          </section>
        </div>
      )}
      <input
        ref={projectExcelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileImport(file, "current");
        }}
      />
      {toast && <div className="toast"><Check /> {toast}</div>}
    </main>
  );
}
