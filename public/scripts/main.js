// public/scripts/familyTree.js
import * as d3 from "https://cdn.skypack.dev/d3@7";

let nodes = [];
let links = [];
let nextId = 1;
let selectedNode = null;

const svg = d3.select("svg");
const width = window.innerWidth;
const height = window.innerHeight - 50;

const zoomGroup = svg.append("g");
svg.call(d3.zoom().on("zoom", event => zoomGroup.attr("transform", event.transform)));

zoomGroup.append("defs").append("marker")
  .attr("id", "arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 22)
  .attr("refY", 0)
  .attr("markerWidth", 6)
  .attr("markerHeight", 6)
  .attr("orient", "auto-start-reverse")
  .append("path")
  .attr("d", "M0,-5L10,0L0,5")
  .attr("fill", "#999");

const popup = document.getElementById("formPopup");
const nameInput = document.getElementById("memberName");
const relationSelect = document.getElementById("relationSelect");
const relationType = document.getElementById("relationType");
const genderMale = document.getElementById("genderMale");
const genderFemale = document.getElementById("genderFemale");
const imgUpload = document.getElementById("imgUpload");
const imgPreview = document.getElementById("imgPreview");

imgUpload.addEventListener("change", () => {
  const file = imgUpload.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    selectedNode.image = e.target.result;
    imgPreview.src = selectedNode.image;
    updateGraph();
  };
  reader.readAsDataURL(file);
});

function updateGraph() {
  zoomGroup.selectAll("*").remove();

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.type === "spouse" ? 50 : 120))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("spouse", spouseForce)
    .on("tick", ticked);

  const link = zoomGroup.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", d => `link ${d.type}`)
    .attr("stroke-width", 2);

  const linkLabels = zoomGroup.append("g")
    .selectAll("text")
    .data(links)
    .join("text")
    .attr("class", "relation-label")
    .text(d => d.type);

  const node = zoomGroup.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .call(drag(simulation))
    .on("click", (event, d) => {
      event.stopPropagation();
      selectedNode = d;
      nameInput.value = d.name;
      genderMale.checked = d.gender === "male";
      genderFemale.checked = d.gender === "female";
      imgPreview.src = d.image || "";
      relationSelect.innerHTML = `<option value="">-- Select --</option>`;
      nodes.forEach(n => {
        if (n.id !== d.id) {
          relationSelect.innerHTML += `<option value="${n.id}">${n.name}</option>`;
        }
      });
      popup.style.left = `${event.pageX}px`;
      popup.style.top = `${event.pageY}px`;
      popup.style.display = "block";
    });

  node.append("circle")
    .attr("r", 20)
    .attr("fill", d => d.image ? "none" : d.color);

  node.append("image")
    .attr("xlink:href", d => d.image || "")
    .attr("x", -20)
    .attr("y", -20)
    .attr("width", 40)
    .attr("height", 40)
    .style("display", d => d.image ? "block" : "none");

  node.append("text")
    .attr("x", 25)
    .attr("y", 5)
    .text(d => d.name);

  svg.on("click", () => closeForm());

  function ticked() {
    nodes.forEach(d => {
      d.x = Math.max(30, Math.min(width - 30, d.x));
      d.y = Math.max(30, Math.min(height - 30, d.y));
    });

    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    linkLabels
      .attr("x", d => (d.source.x + d.target.x) / 2)
      .attr("y", d => (d.source.y + d.target.y) / 2);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  }
}

function drag(simulation) {
  return d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });
}

function spouseForce() {
  links.forEach(l => {
    if (l.type === "spouse") {
      const dx = l.target.x - l.source.x;
      const dy = l.target.y - l.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const k = 0.1;
      const strength = (dist - 50) * k;
      const fx = strength * dx / dist;
      const fy = strength * dy / dist;
      l.source.vx += fx;
      l.source.vy += fy;
      l.target.vx -= fx;
      l.target.vy -= fy;
    }
  });
}

window.addMember = function () {
  const name = prompt("Member name:");
  if (!name) return;
  nodes.push({
    id: nextId++,
    name,
    gender: "",
    color: randomColor()
  });
  updateGraph();
};

window.saveNode = function () {
  if (!selectedNode) return;
  selectedNode.name = nameInput.value;
  selectedNode.gender = genderMale.checked ? "male" : "female";
  updateGraph();
  closeForm();
};

window.deleteNode = function () {
  if (!selectedNode) return;
  if (!confirm(`Delete ${selectedNode.name}?`)) return;
  nodes = nodes.filter(n => n.id !== selectedNode.id);
  links = links.filter(l => l.source.id !== selectedNode.id && l.target.id !== selectedNode.id);
  updateGraph();
  closeForm();
};

window.addChild = function () {
  if (!selectedNode) return;
  const name = prompt("Child's name:");
  if (!name) return;
  nodes.push({
    id: nextId++,
    name,
    gender: "",
    color: randomColor()
  });
  links.push({
    source: selectedNode.id,
    target: nextId - 1,
    type: "child"
  });
  updateGraph();
  closeForm();
};

window.linkToSelected = function () {
  const targetId = parseInt(relationSelect.value);
  const type = relationType.value;
  if (!targetId || !type || targetId === selectedNode.id) return;
  const exists = links.some(l =>
    ((l.source.id || l.source) === selectedNode.id && (l.target.id || l.target) === targetId) ||
    ((l.target.id || l.target) === selectedNode.id && (l.source.id || l.source) === targetId)
  );
  if (exists) return alert("Link already exists.");
  links.push({
    source: selectedNode.id,
    target: targetId,
    type
  });
  updateGraph();
  closeForm();
};

function closeForm() {
  popup.style.display = "none";
  selectedNode = null;
}

function randomColor() {
  return `hsl(${Math.random() * 360}, 60%, 70%)`;
}

updateGraph();
