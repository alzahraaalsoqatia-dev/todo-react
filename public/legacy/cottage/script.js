const input = document.querySelector("input");
const addButton = document.querySelector(".add-button");
const todosHtml = document.querySelector(".todos");
let todosJson = JSON.parse(localStorage.getItem("todos")) || [];
const deleteAllButton = document.querySelector(".delete-all");
const filters = document.querySelectorAll(".filter");
let filter = '';
let editingIndex = null;

showTodos();

function getTodoHtml(todo, index) {
  if (filter && filter != todo.status) {
    return '';
  }
  let checked = todo.status == "completed" ? "checked" : "";
  const escapedName = todo.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  
  if (editingIndex === index) {
    return /* html */ `
      <li class="todo todo-editing">
        <input type="text" class="todo-edit-input" value="${escapedName}" data-index="${index}" 
               onkeydown="handleEditKeydown(event, ${index})" 
               onblur="cancelEdit()" 
               autofocus>
        <button class="edit-save-btn" onpointerdown="(function(e){e.preventDefault();saveEdit(${index})})(event)" onclick="saveEdit(${index})" title="Save">✓</button>
        <button class="edit-cancel-btn" onclick="cancelEdit()" title="Cancel">✕</button>
      </li>
    `;
  }
  
  return /* html */ `
    <li class="todo">
      <label for="${index}">
        <input id="${index}" onclick="updateStatus(this)" type="checkbox" ${checked}>
        <span class="${checked}">${escapedName}</span>
      </label>
      <div class="todo-actions">
        <button class="edit-btn" data-index="${index}" onclick="startEdit(${index})" title="Edit">
          <i class="fa fa-pencil"></i>
        </button>
        <button class="delete-btn" data-index="${index}" onclick="remove(this)"><i class="fa fa-times"></i></button>
      </div>
    </li>
  `; 
}

function showTodos() {
  if (todosJson.length == 0) {
    todosHtml.innerHTML = '';
  } else {
    todosHtml.innerHTML = todosJson.map(getTodoHtml).join('');
    emptyImage.style.display = 'none';
  }
}

function addTodo(todo)  {
  input.value = "";
  todosJson.unshift({ name: todo, status: "pending" });
  localStorage.setItem("todos", JSON.stringify(todosJson));
  showTodos();
}

input.addEventListener("keyup", e => {
  let todo = input.value.trim();
  if (!todo || e.key != "Enter") {
    return;
  }
  addTodo(todo);
});

addButton.addEventListener("click", () => {
  let todo = input.value.trim();
  if (!todo) {
    return;
  }
  addTodo(todo);
});

function updateStatus(todo) {
  let todoName = todo.parentElement.lastElementChild;
  if (todo.checked) {
    todoName.classList.add("checked");
    todosJson[todo.id].status = "completed";
  } else {
    todoName.classList.remove("checked");
    todosJson[todo.id].status = "pending";
  }
  localStorage.setItem("todos", JSON.stringify(todosJson));
}

function remove(todo) {
  const index = todo.dataset.index;
  todosJson.splice(index, 1);
  showTodos();
  localStorage.setItem("todos", JSON.stringify(todosJson));
}

function startEdit(index) {
  editingIndex = index;
  showTodos();
}

function cancelEdit() {
  editingIndex = null;
  showTodos();
}

function saveEdit(index) {
  const input = document.querySelector(`.todo-edit-input[data-index="${index}"]`);
  if (!input) return;
  
  const newName = input.value.trim();
  if (!newName) {
    cancelEdit();
    return;
  }
  
  todosJson[index].name = newName;
  localStorage.setItem("todos", JSON.stringify(todosJson));
  editingIndex = null;
  showTodos();
}

function handleEditKeydown(event, index) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveEdit(index);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  }
}

filters.forEach(function (el) {
  el.addEventListener("click", (e) => {
    if (el.classList.contains('active')) {
      el.classList.remove('active');
      filter = '';
    } else {
      filters.forEach(tag => tag.classList.remove('active'));
      el.classList.add('active');
      filter = e.target.dataset.filter;
    }
    showTodos();
  });
});

deleteAllButton.addEventListener("click", () => {
  todosJson = [];
  localStorage.setItem("todos", JSON.stringify(todosJson));
  showTodos();
});