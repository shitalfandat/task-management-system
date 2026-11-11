const STORAGE_KEY = "taskflow_tasks_v1";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const today = new Date();
today.setHours(0, 0, 0, 0);
let tasks = loadTasks();
let activeFilter = "all";
let toastTimer;

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored)) return stored;
  } catch (error) { console.warn("Could not read saved tasks:", error); }
  return [
    {id: crypto.randomUUID(), title:"Complete the project documentation", description:"Review the final sections and update screenshots.", category:"Study", priority:"High", dueDate:dateKey(new Date()), completed:false, createdAt:Date.now()-300000},
    {id: crypto.randomUUID(), title:"Prepare for the weekly team meeting", description:"Collect updates and list discussion points.", category:"Work", priority:"Medium", dueDate:dateKey(new Date(Date.now()+86400000)), completed:false, createdAt:Date.now()-200000},
    {id: crypto.randomUUID(), title:"Organize notes and study material", description:"Sort notes by subject and revise key topics.", category:"Personal", priority:"Low", dueDate:"", completed:true, createdAt:Date.now()-100000}
  ];
}
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function formatDate(dateString) {
  if (!dateString) return "No due date";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined,{day:"numeric",month:"short"});
}
function isOverdue(task) {
  return task.dueDate && !task.completed && task.dueDate < dateKey(today);
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function getFilteredTasks() {
  const search = $("#searchInput").value.trim().toLowerCase();
  const priority = $("#priorityFilter").value;
  let filtered = tasks.filter(task => {
    const matchesSearch = `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(search);
    const matchesPriority = priority === "all" || task.priority === priority;
    let matchesView = true;
    if (activeFilter === "today") matchesView = task.dueDate === dateKey(today) && !task.completed;
    if (activeFilter === "upcoming") matchesView = task.dueDate > dateKey(today) && !task.completed;
    if (activeFilter === "completed") matchesView = task.completed;
    return matchesSearch && matchesPriority && matchesView;
  });
  const sort = $("#sortFilter").value;
  if (sort === "due") filtered.sort((a,b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  else if (sort === "priority") {
    const rank = {High:0,Medium:1,Low:2};
    filtered.sort((a,b) => rank[a.priority]-rank[b.priority]);
  } else filtered.sort((a,b) => b.createdAt-a.createdAt);
  return filtered;
}
function renderTask(task) {
  const dueClass = isOverdue(task) ? "due-label overdue" : "due-label";
  return `<article class="task-row ${task.completed ? "done" : ""}">
    <input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} complete" data-action="toggle" data-id="${task.id}" ${task.completed ? "checked" : ""}>
    <div class="task-main">
      <div class="task-title">${escapeHTML(task.title)}</div>
      ${task.description ? `<div class="task-description">${escapeHTML(task.description)}</div>` : ""}
      <div class="task-meta"><span class="tag">${escapeHTML(task.category)}</span><span class="priority ${task.priority}">● ${task.priority}</span><span class="${dueClass}">◷ ${formatDate(task.dueDate)}${isOverdue(task) ? " · Overdue" : ""}</span></div>
    </div>
    <div class="task-actions"><button class="task-action" data-action="edit" data-id="${task.id}" aria-label="Edit task" title="Edit">✎</button><button class="task-action" data-action="delete" data-id="${task.id}" aria-label="Delete task" title="Delete">×</button></div>
  </article>`;
}
function render() {
  const filtered = getFilteredTasks();
  $("#taskList").innerHTML = filtered.map(renderTask).join("");
  $("#visibleTaskCount").textContent = filtered.length;
  $("#emptyState").classList.toggle("hidden", filtered.length > 0);
  $("#taskList").classList.toggle("hidden", filtered.length === 0);
  const completed = tasks.filter(t=>t.completed).length;
  const pending = tasks.length-completed;
  const rate = tasks.length ? Math.round(completed/tasks.length*100) : 0;
  $("#totalTasks").textContent = tasks.length;
  $("#inProgressTasks").textContent = pending;
  $("#completedTasks").textContent = completed;
  $("#completionRate").textContent = rate;
  $("#completionBar").style.width = `${rate}%`;
  $("#allCount").textContent = tasks.length;
  $("#todayFocusCount").innerHTML = `${tasks.filter(t=>t.dueDate===dateKey(today)&&!t.completed).length} <small>tasks due today</small>`;
  const todayTasks = tasks.filter(t=>t.dueDate===dateKey(today)&&!t.completed).slice(0,3);
  $("#todayFocusList").innerHTML = todayTasks.length ? todayTasks.map(t=>`<div class="focus-item"><span class="focus-bullet"></span><span>${escapeHTML(t.title)}</span></div>`).join("") : `<div class="focus-empty">You're all clear for today. Nice!</div>`;
  ["Work","Personal","Study","Other"].forEach(category => {
    const id = category.toLowerCase();
    $(`#${id}Count`).textContent = tasks.filter(t=>t.category===category).length;
  });
}
function openModal(task=null) {
  $("#taskForm").reset();
  $("#taskId").value = task?.id || "";
  $("#taskTitle").value = task?.title || "";
  $("#taskDescription").value = task?.description || "";
  $("#taskCategory").value = task?.category || "Work";
  $("#taskPriority").value = task?.priority || "Medium";
  $("#taskDueDate").value = task?.dueDate || "";
  $("#modalTitle").textContent = task ? "Edit task" : "Create a task";
  $("#saveTaskButton").innerHTML = task ? 'Update task <span>→</span>' : 'Save task <span>→</span>';
  $("#taskModal").classList.remove("hidden");
  setTimeout(()=>$("#taskTitle").focus(),50);
}
function closeModal() {
  $("#taskModal").classList.add("hidden");
}
function setFilter(filter) {
  activeFilter = filter;
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.filter===filter));
  const labels = {all:"Overview",today:"Today",upcoming:"Upcoming",completed:"Completed"};
  $("#breadcrumbLabel").textContent = labels[filter];
  $("#taskHeading").firstChild.textContent = filter==="all" ? "All tasks " : `${labels[filter]} `;
  render();
}

$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) return;
  const id = $("#taskId").value;
  const existing = tasks.find(t=>t.id===id);
  const task = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    title,
    description: $("#taskDescription").value.trim(),
    category: $("#taskCategory").value,
    priority: $("#taskPriority").value,
    dueDate: $("#taskDueDate").value,
    completed: existing?.completed || false,
    createdAt: existing?.createdAt || Date.now()
  };
  if (existing) {
    tasks = tasks.map(t=>t.id===id ? task : t);
    showToast("Task updated successfully");
  } else {
    tasks.unshift(task);
    showToast("New task added");
  }
  saveTasks(); closeModal(); render();
});
$("#taskList").addEventListener("click", event => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const {action,id} = control.dataset;
  const task = tasks.find(t=>t.id===id);
  if (!task) return;
  if (action==="toggle") {
    task.completed = control.checked;
    showToast(task.completed ? "Task completed — well done!" : "Task moved back to in progress");
  }
  if (action==="edit") openModal(task);
  if (action==="delete" && confirm(`Delete "${task.title}"?`)) {
    tasks = tasks.filter(t=>t.id!==id);
    showToast("Task deleted");
  }
  saveTasks(); render();
});
$$(".nav-item").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));
["#searchInput","#priorityFilter","#sortFilter"].forEach(selector=>$(selector).addEventListener("input",render));
$("#addTaskTop").addEventListener("click",()=>openModal());
$("#emptyAddButton").addEventListener("click",()=>openModal());
$("#closeModal").addEventListener("click",closeModal);
$("#cancelModal").addEventListener("click",closeModal);
$("#taskModal").addEventListener("click",event=>{if(event.target===$("#taskModal"))closeModal();});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal();});
$("#clearCompleted").addEventListener("click",()=>{
  const count=tasks.filter(t=>t.completed).length;
  if(!count){showToast("There are no completed tasks to clear");return;}
  if(confirm(`Clear ${count} completed task(s)?`)){
    tasks=tasks.filter(t=>!t.completed);saveTasks();render();showToast("Completed tasks cleared");
  }
});
$("#themeToggle").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  const dark=document.body.classList.contains("dark");
  $("#themeToggle").textContent=dark?"☀":"☾";
  localStorage.setItem("taskflow_theme",dark?"dark":"light");
});
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#profileButton").addEventListener("click",()=>showToast("Welcome to your personal workspace"));
const savedTheme=localStorage.getItem("taskflow_theme");
if(savedTheme==="dark"){document.body.classList.add("dark");$("#themeToggle").textContent="☀";}
$("#todayDate").textContent=today.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"});
const hour=new Date().getHours();
$("#greeting").textContent=hour<12?"GOOD MORNING — YOUR PRODUCTIVITY SPACE":hour<17?"YOUR PRODUCTIVITY SPACE":"GOOD EVENING — YOUR PRODUCTIVITY SPACE";
render();
