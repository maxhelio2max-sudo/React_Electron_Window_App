// src/App.jsx
import React, { useState, useRef, useEffect } from "react";

export default function App() {
  const [points, setPoints] = useState([]); 
  const [links, setLinks] = useState([]); 
  const [vectors, setVectors] = useState([]); 

  const [addLinkMode, setAddLinkMode] = useState(false);
  const [addVectorMode, setAddVectorMode] = useState(false);
  const [angleMode, setAngleMode] = useState(false);

  const [tempSelectIndex, setTempSelectIndex] = useState(null);
  const [selectedLines, setSelectedLines] = useState([]);

  const [vectorScale, setVectorScale] = useState(1);

  const nextLinkId = useRef(1);
  const nextVectorId = useRef(1);

  const suppressClickRef = useRef(false);
  const lastDragTimeRef = useRef(0);

  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e) => e.preventDefault();
    svg.addEventListener("contextmenu", handler);
    return () => svg.removeEventListener("contextmenu", handler);
  }, []);

  const safePoint = (i) => (i >= 0 && i < points.length ? points[i] : null);

  const screenToSvg = (evt) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const buildSceneData = () => ({
    meta: { createdAt: new Date().toISOString(), vectorScale, formatVersion: 1 },
    points: points.map((p) => ({
      x: p.x,
      y: p.y,
      vectors: (p.vectors || []).map(v => ({ id: v.id, fx: v.fx, fy: v.fy }))
    })),
    links: links.map(l => ({ id: l.id, a: l.a, b: l.b })),
    vectors: vectors.map(v => ({ id: v.id, startPoint: v.startPoint, fx: v.fx, fy: v.fy }))
  });

  function downloadJson(data, filename = "scene.json") {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportScene() {
    const data = buildSceneData();
    if (window?.electronAPI?.invoke) {
      try {
        const res = await window.electronAPI.invoke("save-json", data);
        if (res?.ok) alert("Сохранено: " + res.filePath);
        else if (!res?.canceled) alert("Ошибка: " + (res?.error || "unknown"));
      } catch (err) { alert("Ошибка: " + err.message); }
    } else {
      downloadJson(data);
    }
  }

  function applyImportedData(data) {
    try {
      if (!data || !Array.isArray(data.points)) throw new Error("Неверный формат (нет points)");
      const loadedPoints = data.points.map(p => ({
        x: Number(p.x),
        y: Number(p.y),
        vectors: Array.isArray(p.vectors)
          ? p.vectors.map(v => ({ id: Number(v.id), fx: Number(v.fx), fy: Number(v.fy) }))
          : []
      }));
      const loadedLinks = Array.isArray(data.links) ? data.links : [];
      const loadedVectors = Array.isArray(data.vectors) ? data.vectors : [];

      setPoints(loadedPoints);
      setLinks(loadedLinks);
      setVectors(loadedVectors);
      if (data.meta?.vectorScale) setVectorScale(data.meta.vectorScale);

      alert("Импорт выполнен");
    } catch (err) { alert("Ошибка импорта: " + err.message); }
  }

  async function importScene() {
    if (window?.electronAPI?.invoke) {
      try {
        const res = await window.electronAPI.invoke("open-json");
        if (res?.ok && res.data) applyImportedData(res.data);
        else if (!res?.canceled) alert("Ошибка: " + (res?.error || "unknown"));
      } catch (err) { alert("Ошибка: " + err.message); }
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try { applyImportedData(JSON.parse(reader.result)); }
          catch (err) { alert("Неверный JSON"); }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  }


  const MAX_POINTS = 5;

  const handleSvgClick = (e) => {
    const now = Date.now();
    if (suppressClickRef.current || (now - lastDragTimeRef.current) < 300) return;
    if (addVectorMode && tempSelectIndex != null) return;
    if (addLinkMode || addVectorMode || angleMode) return;

    if (points.length >= MAX_POINTS) {   
      alert("Максимум 5 точек");              
      return;                           
    }

    const { x, y } = screenToSvg(e);
    setPoints(prev => [...prev, { x, y, vectors: [] }]);
  };

  


  const onPointMouseDown = (index, e) => {
    e.stopPropagation();
    if (e.button === 2) return;

    if (addLinkMode) {
      if (tempSelectIndex == null) setTempSelectIndex(index);
      else if (tempSelectIndex !== index) {
        setLinks(prev => [...prev, { id: nextLinkId.current++, a: tempSelectIndex, b: index }]);
        setTempSelectIndex(null);
        setAddLinkMode(false);
      }
      return;
    }

    if (addVectorMode && tempSelectIndex == null) {
      setTempSelectIndex(index);
      return;
    }

    if (angleMode) return;

    let isDragging = false;
    const start = { x: e.clientX, y: e.clientY };

    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging = true;
        suppressClickRef.current = true;
      }
      if (isDragging) {
        const rect = svgRef.current.getBoundingClientRect();
        const nx = ev.clientX - rect.left;
        const ny = ev.clientY - rect.top;
        setPoints(prev => {
          const arr = [...prev];
          arr[index] = { ...arr[index], x: nx, y: ny };
          return arr;
        });
      }
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (!isDragging) deletePoint(index);
      else {
        lastDragTimeRef.current = Date.now();
        suppressClickRef.current = true;
        setTimeout(() => { suppressClickRef.current = false; }, 300);
      }
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const deletePoint = (index) => {
    setPoints(prev => {
      const newPoints = prev.filter((_, i) => i !== index);
      setLinks(prevLinks =>
        prevLinks
          .filter(l => l.a !== index && l.b !== index)
          .map(l => ({ id: l.id, a: l.a > index ? l.a - 1 : l.a, b: l.b > index ? l.b - 1 : l.b }))
      );
      setVectors(prevVectors =>
        prevVectors
          .filter(v => v.startPoint !== index)
          .map(v => ({ ...v, startPoint: v.startPoint > index ? v.startPoint - 1 : v.startPoint }))
      );
      return newPoints;
    });
    if (tempSelectIndex === index) setTempSelectIndex(null);
    if (tempSelectIndex > index) setTempSelectIndex(prev => prev - 1);
  };

  const handleSvgClickForVectorEnd = (e) => {
    if (!addVectorMode || tempSelectIndex == null) return;
    const { x: ex, y: ey } = screenToSvg(e);
    const startPt = points[tempSelectIndex];
    if (!startPt) {
      setTempSelectIndex(null);
      setAddVectorMode(false);
      return;
    }
    const fx = ex - startPt.x;
    const fy = ey - startPt.y;
    const vec = { id: nextVectorId.current++, startPoint: tempSelectIndex, fx, fy };
    setVectors(prev => [...prev, vec]);
    setTempSelectIndex(null);
    setAddVectorMode(false);
  };

  const pickLine = (obj) => {
    if (!angleMode) return;

    setSelectedLines(prev => {
      if (prev.length === 0) return [obj];
      if (prev.length === 1) {
        const res = computeAngle(prev[0], obj);
        if (!res) alert("Нет общей точки");
        else alert(`Угол: ${res.deg}°`);
        setAngleMode(false);
        return [];
      }
      return prev;
    });
  };

  const computeAngle = (L1, L2) => {
    const ptsOf = (L) => L.type === "link" ? [L.a, L.b] : [L.startPoint];
    const common = ptsOf(L1).find(i => ptsOf(L2).includes(i));
    if (common === undefined) return null;

    const vec = (L) => {
      if (L.type === "link") {
        const pA = points[L.a], pB = points[L.b];
        if (common === L.a) return { x: pB.x - pA.x, y: pB.y - pA.y };
        return { x: pA.x - pB.x, y: pA.y - pB.y };
      }
      return { x: L.fx, y: L.fy };
    };

    const v1 = vec(L1);
    const v2 = vec(L2);
    const dot = v1.x * v2.x + v1.y * v2.y;
    const m1 = Math.hypot(v1.x, v1.y);
    const m2 = Math.hypot(v2.x, v2.y);
    let cos = dot / (m1 * m2);
    cos = Math.max(-1, Math.min(1, cos));
    return { deg: (Math.acos(cos) * 180 / Math.PI).toFixed(2) };
  };

  const renderLinks = () =>
    links.map(l => {
      const p1 = safePoint(l.a), p2 = safePoint(l.b);
      if (!p1 || !p2) return null;
      return (
        <line key={l.id}
          x1={p1.x} y1={p1.y}
          x2={p2.x} y2={p2.y}
          stroke="#333" strokeWidth={2}
          onClick={(e) => { e.stopPropagation(); pickLine({ type: "link", id: l.id, a: l.a, b: l.b }); }}
        />
      );
    });

  const renderVectors = () =>
    vectors.map(v => {
      const p = safePoint(v.startPoint);
      if (!p) return null;
      const sx = p.x, sy = p.y;
      const dx = v.fx * vectorScale, dy = v.fy * vectorScale;
      const ex = sx + dx, ey = sy + dy;

      const ang = Math.atan2(dy, dx);
      const head = 8;
      const side = Math.PI / 7;
      const hx1 = ex - head * Math.cos(ang - side);
      const hy1 = ey - head * Math.sin(ang - side);
      const hx2 = ex - head * Math.cos(ang + side);
      const hy2 = ey - head * Math.sin(ang + side);

      const mag = Math.hypot(v.fx, v.fy);
      const angDeg = Math.atan2(v.fy, v.fx) * 180 / Math.PI;

      return (
        <g key={v.id}
          onClick={(e) => { e.stopPropagation(); pickLine({ type: "vector", id: v.id, startPoint: v.startPoint, fx: v.fx, fy: v.fy }); }}>
          <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#c00" strokeWidth={2} />
          <polygon points={`${ex},${ey} ${hx1},${hy1} ${hx2},${hy2}`} fill="#c00" />
          <text x={ex + 6} y={ey + 6} fontSize={12} fill="#900">
            {`${mag.toFixed(1)} (${angDeg.toFixed(0)}°)`}
          </text>
        </g>
      );
    });



  return (
    <div style={{ padding: 14 }}>
      <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
        <button onClick={() => { setAddLinkMode(m => !m); setAddVectorMode(false); setAngleMode(false); setTempSelectIndex(null); }}>
          {addLinkMode ? "Отмена связи" : "Добавить связь"}
        </button>

        <button onClick={() => { setAddVectorMode(m => !m); setAddLinkMode(false); setAngleMode(false); setTempSelectIndex(null); }}>
          {addVectorMode ? "Отмена вектора" : "Добавить вектор"}
        </button>

        <button onClick={() => { setAngleMode(m => !m); setAddLinkMode(false); setAddVectorMode(false); setTempSelectIndex(null); setSelectedLines([]); }}>
          {angleMode ? "Отмена угла" : "Угол"}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={exportScene}>Экспортировать</button>
          <button onClick={importScene}>Импортировать</button>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={900}
        height={600}
        style={{ border: "1px solid #bbb", background: "#fff" }}
        onClick={(e) => { handleSvgClick(e); handleSvgClickForVectorEnd(e); }}
      >
        {renderLinks()}
        {renderVectors()}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={6}
            fill="red" stroke="#222"
            onMouseDown={(e) => onPointMouseDown(i, e)}
            onClick={(e) => e.stopPropagation()}
          />
        ))}

        {addLinkMode && tempSelectIndex != null &&
          <text x={10} y={20} fontSize={14}>Кликните вторую точку</text>}
        {addVectorMode && tempSelectIndex != null &&
          <text x={10} y={20} fontSize={14}>Кликните в поле — конец вектора</text>}
        {angleMode &&
          <text x={10} y={20} fontSize={14}>Выберите две линии</text>}
      </svg>

      <div style={{ marginTop: 8 }}>
        <span>Точек: {points.length}</span>
        <span style={{ marginLeft: 12 }}>Связей: {links.length}</span>
        <span style={{ marginLeft: 12 }}>Векторов: {vectors.length}</span>

        <span style={{ marginLeft: 12 }}>Масштаб векторов:</span>
        <input
          type="range" min="0.2" max="4" step="0.1"
          value={vectorScale}
          onChange={(e) => setVectorScale(Number(e.target.value))}
        />
        <span style={{ marginLeft: 6 }}>{vectorScale.toFixed(1)}x</span>
      </div>

      
      <div style={{ marginTop: 12, padding: 8, background: "#f4f4f4", borderRadius: 6 }}>
        <b>Координаты точек:</b>
        <ul style={{ marginTop: 6 }}>
          {points.map((p, i) => (
            <li key={i}>Точка {i + 1}: X={p.x.toFixed(1)}, Y={p.y.toFixed(1)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
