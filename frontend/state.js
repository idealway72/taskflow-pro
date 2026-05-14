import { renderTaskList } from './render.js';

let tasks = [];
let activeFilter = '';

export function setTasks(data) {
  tasks = data;
  renderTaskList(data);
}

export function getTasks()     { return tasks; }
export function getFilter()    { return activeFilter; }
export function setFilter(f)   { activeFilter = f; }
