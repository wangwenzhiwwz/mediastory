"use client";

import {
  ArrowLeft, Bell, CaretDown, CaretUp, Check, CirclesFour, Clock, Copy,
  DotsSixVertical, DotsThree, DownloadSimple, Eye, EyeSlash, Export, FileArrowDown,
  FilmSlate, Folder, FolderOpen, GearSix,
  ImageSquare, List, MagnifyingGlass, PencilSimple, Play,
  Plus, Rows, ShareNetwork, SlidersHorizontal, SquaresFour, TextT, Trash,
  UploadSimple, UserPlus, UsersThree, X,
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
    return ["48px", "52px", ...colWidths, "44px"].join(" ");
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
      }
      if (event.altKey && event.key.toLowerCase() === "n" && screen === "project" && tab === "分镜制作") {
        event.preventDefault(); addShot();
      }
    };
    window.addEventListener("paste", handlePaste);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("keydown", handleKey);
    };
  }, [hoveredImageId, selectedImageId, screen, tab, project?.id, workspace]);

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

  function updateProject(patch: Partial<Project>) {
    if (!project) return;
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
    const name = prompt("请输入模板名称", `${project?.name || "分镜"}列模板`);
    if (!name?.trim()) return;
    const template: ColumnTemplate = {
      id: uid("template"),
      name: name.trim(),
      columns: columnSettings.map((column) => ({ ...column })),
    };
    void persist({ ...workspace, columnTemplates: [...(workspace.columnTemplates || []), template] });
    setToast("列模板已保存");
  }

  function applyColumnTemplate(id: string) {
    const template = workspace.columnTemplates?.find((item) => item.id === id);
    if (template) commitColumns(template.columns.map((column) => ({ ...column })));
  }

  function updateShot(id: string, patch: Partial<Shot>) {
    if (!project) return;
    updateProject({ shots: project.shots.map((shot) => shot.id === id ? { ...shot, ...patch } : shot) });
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
    const index = afterId ? shots.findIndex((s) => s.id === afterId) + 1 : shots.length;
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
    const sourceIndex = shots.findIndex((s) => s.id === sourceId);
    if (sourceIndex === -1) return;
    const [moved] = shots.splice(sourceIndex, 1);

    let targetIndex = shots.findIndex((s) => s.id === targetId);
    if (targetIndex === -1) {
      shots.push(moved);
    } else {
      if (position === "after") {
        targetIndex += 1;
      }
      shots.splice(targetIndex, 0, moved);
    }

    updateProject({ shots: shots.map((s, idx) => ({ ...s, no: idx + 1 })) });
    setDragId("");
    setDropTargetId("");
    setDropPosition(null);
    setToast("镜头顺序已更新");
  }

  function reorder(targetId?: string, targetScene?: string) {
    if (!project || !dragId || dragId === targetId) return;
    const shots = [...project.shots];
    const from = shots.findIndex((shot) => shot.id === dragId);
    if (from < 0) return;
    const [moved] = shots.splice(from, 1);
    if (targetScene !== undefined) moved.scene = targetScene;
    if (targetId) {
      const targetIndex = shots.findIndex((shot) => shot.id === targetId);
      shots.splice(targetIndex < 0 ? shots.length : targetIndex, 0, moved);
    } else if (targetScene !== undefined) {
      const lastSceneIndex = shots.reduce((last, shot, index) => shot.scene === targetScene ? index : last, -1);
      shots.splice(lastSceneIndex + 1, 0, moved);
    } else {
      shots.push(moved);
    }
    updateProject({ shots: shots.map((shot, index) => ({ ...shot, no: index + 1 })) });
    setDragId(""); setDropTargetId(""); setDropPosition(null);
    setToast(targetScene !== undefined ? `镜头已移至“${targetScene || "未规划镜头"}”` : "镜头顺序已更新");
  }

  function endShotDrag() {
    setDragId("");
    setDropTargetId("");
    setDropPosition(null);
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
    return fallbackImages[(shot.no - 1) % fallbackImages.length];
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

  if (loading) return <main className="loading-page"><div className="flash-logo"><CirclesFour weight="fill" /></div><p>正在打开 MediaStory…</p></main>;

  if (!accessKey) return (
    <main className="login-page">
      <section className="login-card">
        <div className="flash-logo"><CirclesFour weight="fill" /></div>
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
        <div className="bolt-brand"><div className="flash-logo"><CirclesFour weight="fill" /></div></div>
        <nav>
          <button className="active"><FolderOpen weight="fill" /><span>项目</span></button>
          <button><UsersThree /><span>联系人</span></button>
        </nav>
        <button className="account-button"><div className="flash-logo small"><CirclesFour weight="fill" /></div><span>我的账号</span></button>
      </aside>
      <section className="projects-main">
        <header className="projects-top">
          <div><h1>我的项目</h1><p>排序&nbsp;&nbsp;<b>最近编辑</b></p></div>
          <div className="projects-actions">
            <label className="search-box"><MagnifyingGlass /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索项目名…" /></label>
            <button className="pill-button"><SquaresFour /> 模板</button><button className="round-button"><Bell /></button>
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
                <div className="folder-visual"><Folder weight="fill" /><span>{item.shots.length}</span></div>
                <h3>{item.name}</h3><p>{item.client || "未设置客户"}</p>
                <small>更新 {item.createdAt ? new Date(item.createdAt).toLocaleDateString("zh-CN") : "刚刚"}</small>
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
                <div className={`print-table-row ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`} draggable onDragStart={() => setDragId(shot.id)} onDragEnd={endShotDrag} onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== shot.id) setDropTargetId(shot.id); }} onDrop={(e) => { e.preventDefault(); reorder(shot.id); }} key={shot.id}>
                  <b>{shot.no}</b>
                  <img src={imageFor(shot)} alt="" />
                  <span>{shot.shotSize || ""}</span>
                  <span>{shot.duration ? shot.duration : ""}</span>
                  <p className="align-left">{shot.description || ""}</p>
                  <p className="align-left note-cell">{shot.note || ""}</p>
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
        <div className="project-tools"><div className="flash-logo tiny"><CirclesFour weight="fill" /></div><button className="round-button"><Bell /></button><button className="round-button"><DotsThree /></button><button className="pill-button"><ShareNetwork /> 协作</button><button className="pill-button" onClick={() => setScreen("export")}><Export /> 导出</button></div>
      </header>

      {tab === "分镜制作" && (
        <section className="flow-page">
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
              <button className={batchMode ? "pill-button active-control" : "pill-button"} onClick={() => { setBatchMode(!batchMode); setSelectedShotIds([]); }}>
                <Rows /> 批量模式
              </button>
              {batchMode && (
                <button className="pill-button danger-control" disabled={!selectedShotIds.length} onClick={deleteSelectedShots}>
                  <Trash /> 删除 {selectedShotIds.length || ""}
                </button>
              )}
              <div className="menu-anchor">
                <button className="pill-button" onClick={() => { setBatchMode(true); setSelectionMenu(!selectionMenu); }}>
                  <Check /> 选择 <CaretDown />
                </button>
                {selectionMenu && (
                  <div className="action-popover selection-menu">
                    <button onClick={() => { setSelectedShotIds(project.shots.map((s) => s.id)); setSelectionMenu(false); }}>全选镜头</button>
                    <button onClick={() => { setSelectedShotIds(project.shots.filter((s) => s.status === "待拍摄").map((s) => s.id)); setSelectionMenu(false); }}>选择待拍摄</button>
                    <button onClick={() => { setSelectedShotIds([]); setSelectionMenu(false); }}>取消选择</button>
                  </div>
                )}
              </div>
              <div className="menu-anchor">
                <button className="pill-button" onClick={() => setSettingsMenu(settingsMenu === "display" ? null : "display")}>
                  <SlidersHorizontal /> 分镜设置 <CaretDown />
                </button>
                {settingsMenu === "display" && (
                  <div className="action-popover display-menu">
                    <button><TextT /> 文字大小 <b>小</b></button>
                    <button><ImageSquare /> 图片比例 <b>16:9</b></button>
                    <button><ImageSquare /> 图片适配 <b>适应</b></button>
                    <button><Rows /> 文字对齐 <b>居中</b></button>
                    <button><GearSix /> 镜号设置</button>
                  </div>
                )}
              </div>
              <button className="pill-button" onClick={() => setShowColumnModal(true)}>
                <GearSix weight="bold" /> 列设置
              </button>
            </div>
          </div>
          <div className="shot-table">
            <div className="table-head" style={{ gridTemplateColumns: tableTemplate }}>
              <span>排序</span>
              <span>镜号</span>
              {visibleColumnSettings.map((column) => <span key={column.key}>{column.label}</span>)}
              <span>
                <button className="head-add-column" title="列设置与添加列" onClick={() => setShowColumnModal(true)}>
                  <Plus weight="bold" />
                </button>
              </span>
            </div>
            {project.shots.map((shot) => (
              <div className="table-wrap" key={shot.id}>
                <article
                  className={`shot-row ${dragId === shot.id ? "is-dragging" : ""} ${
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
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      if (dropTargetId === shot.id) {
                        setDropTargetId("");
                        setDropPosition(null);
                      }
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId && dragId !== shot.id) {
                      reorderShots(dragId, shot.id, dropPosition || "after");
                    }
                  }}
                >
                  {batchMode ? (
                    <div>
                      <label className="batch-check">
                        <input
                          type="checkbox"
                          checked={selectedShotIds.includes(shot.id)}
                          onChange={(e) =>
                            setSelectedShotIds(
                              e.target.checked
                                ? [...selectedShotIds, shot.id]
                                : selectedShotIds.filter((id) => id !== shot.id)
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <button
                        className="drag-button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", shot.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(shot.id);
                        }}
                        onDragEnd={endShotDrag}
                        title="拖动调整镜头顺序"
                      >
                        <List weight="bold" />
                      </button>
                    </div>
                  )}
                  <b>{shot.no}</b>
                  {visibleColumnSettings.map((column) => {
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
          <div className="table-summary">镜头总数 {project.shots.length}　 总时长 {totalDuration} 秒</div>
        </section>
      )}

      {tab === "故事板" && (
        <section className="flow-page soft-bg">
          <div className="page-toolbar"><div><h1>预览故事版 <button className="help-dot">?</button></h1><button className="yellow-btn" onClick={() => addShot()}><Plus /> 新建镜头</button><span className="quick-hint">拖动卡片右上角抓手调整顺序</span></div><div><button className="pill-button"><CirclesFour /> 显示设置</button><button className="pill-button"><Play /> 放映模式</button></div></div>
          <div className="story-grid">{project.shots.map((shot) => <article
            className={`story-card ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`}
            key={shot.id}
            onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== shot.id) setDropTargetId(shot.id); }}
            onDragLeave={() => setDropTargetId((current) => current === shot.id ? "" : current)}
            onDrop={(e) => { e.preventDefault(); reorder(shot.id); }}
          ><button className="card-drag-handle" draggable onDragStart={() => setDragId(shot.id)} onDragEnd={endShotDrag} title="拖动调整镜头顺序"><DotsSixVertical /></button><img src={imageFor(shot)} alt="" /><div className="story-tags"><span>{shot.shotSize || "未设置"}</span><span>{shot.duration || 0}s</span></div><h3>{shot.description || "暂无内容"}</h3><footer><span>镜头 {shot.no}</span><button title="编辑镜头" onClick={() => setEditingShot(shot.id)}><PencilSimple /></button></footer></article>)}</div>
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
              onDragOver={(e) => { e.preventDefault(); if (dragId) setDropTargetId(`scene:${scene}`); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetId(""); }}
              onDrop={(e) => { e.preventDefault(); reorder(undefined, scene === "未规划镜头" ? "" : scene); }}
            ><header><div><h2>{scene}</h2><p><Clock /> {project.dueDate} · {shots.reduce((sum, s) => sum + s.duration, 0)} 秒</p></div><span>{shots.length}</span><button title="编辑场景名称"><PencilSimple /></button></header><div className="plan-list">{shots.map((shot) => <div
              className={`plan-shot ${dragId === shot.id ? "is-dragging" : ""} ${dropTargetId === shot.id ? "is-drop-target" : ""}`}
              key={shot.id}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragId && dragId !== shot.id) setDropTargetId(shot.id); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); reorder(shot.id, scene === "未规划镜头" ? "" : scene); }}
            ><button className="plan-drag-handle" draggable onDragStart={() => setDragId(shot.id)} onDragEnd={endShotDrag} title="拖动排序或移动到其他场景"><DotsSixVertical /></button><input type="checkbox" checked={shot.status === "已完成"} onChange={(e) => updateShot(shot.id, { status: e.target.checked ? "已完成" : "待拍摄" })} /><img src={imageFor(shot)} alt="" /><div><small>镜头 {shot.no}</small><b>{shot.description || "暂无内容"}</b></div><button className="plan-edit-button" title="编辑镜头" onClick={() => setEditingShot(shot.id)}><PencilSimple /></button></div>)}</div></article>)}
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
