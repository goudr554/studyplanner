// Initialize application state
let studyTasks = [];
let currentSession = {
    active: false,
    currentTaskIndex: -1,
    startTime: null,
    pauseTime: null,
    isPaused: false,
    completedTasks: []
};

// AI suggestion templates
const suggestionTemplates = [
    "Based on your tasks, consider breaking down '{task}' into smaller study segments.",
    "For a more effective study session, tackle '{task}' before '{otherTask}' to build foundational knowledge.",
    "To maximize retention, consider taking a 5-minute break after studying '{task}'.",
    "Research shows that '{task}' might be better studied in the morning when your concentration is higher.",
    "Looking at your goal: '{goal}', consider adding tasks related to practical applications.",
    "To reach your goal of '{goal}', you might want to add review sessions for previously studied material.",
    "Try the Pomodoro technique (25 min study, 5 min break) for intensive topics like '{task}'.",
    "Based on your plan, consider alternating between '{task}' and '{otherTask}' to maintain engagement."
];

// DOM Elements
const taskInput = document.getElementById('task-input');
const prioritySelect = document.getElementById('priority-select');
const durationInput = document.getElementById('duration-input');
const goalInput = document.getElementById('goal-input');
const addTaskBtn = document.getElementById('add-task-btn');
const generatePlanBtn = document.getElementById('generate-plan-btn');
const taskList = document.getElementById('task-list');
const suggestionsContainer = document.getElementById('suggestions-container');
const startSessionBtn = document.getElementById('start-session-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const studySession = document.getElementById('study-session');
const currentTaskTitle = document.getElementById('current-task-title');
const timer = document.getElementById('timer');
const pauseBtn = document.getElementById('pause-btn');
const completeBtn = document.getElementById('complete-btn');
const nextTask = document.getElementById('next-task');
const endSessionBtn = document.getElementById('end-session-btn');
const summaryModal = document.getElementById('summary-modal');
const summaryContent = document.getElementById('summary-content');
const closeSummaryBtn = document.getElementById('close-summary-btn');

// Load saved data from localStorage
function loadSavedData() {
    const savedTasks = localStorage.getItem('studyTasks');
    if (savedTasks) {
        studyTasks = JSON.parse(savedTasks);
        renderTaskList();
        updateStartButtonState();
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('studyTasks', JSON.stringify(studyTasks));
}

// Add a new task
function addTask() {
    const title = taskInput.value.trim();
    const priority = prioritySelect.value;
    const duration = parseInt(durationInput.value, 10);
    
    if (!title || isNaN(duration) || duration < 5 || duration > 180) {
        alert('Please enter a valid task title and duration (5-180 minutes).');
        return;
    }
    
    const newTask = {
        id: Date.now(),
        title,
        priority,
        duration,
        completed: false
    };
    
    studyTasks.push(newTask);
    taskInput.value = '';
    durationInput.value = '30';
    
    saveData();
    renderTaskList();
    generateSuggestions();
    updateStartButtonState();
}

// Remove a task
function removeTask(id) {
    studyTasks = studyTasks.filter(task => task.id !== id);
    saveData();
    renderTaskList();
    generateSuggestions();
    updateStartButtonState();
}

// Render the task list
function renderTaskList() {
    if (studyTasks.length === 0) {
        taskList.innerHTML = '<p class="empty-list-message">No study tasks yet. Add some to get started!</p>';
        return;
    }
    
    taskList.innerHTML = '';
    studyTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.priority}-priority`;
        taskElement.innerHTML = `
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} | 
                    Duration: ${task.duration} minutes
                </div>
            </div>
            <div class="task-actions">
                <button class="remove-task-btn" data-id="${task.id}">Remove</button>
            </div>
        `;
        taskList.appendChild(taskElement);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-task-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'), 10);
            removeTask(id);
        });
    });
}

// Update the start button state
function updateStartButtonState() {
    startSessionBtn.disabled = studyTasks.length === 0;
}

// Generate AI suggestions
function generateSuggestions() {
    if (studyTasks.length === 0 && !goalInput.value.trim()) {
        suggestionsContainer.innerHTML = '<p class="suggestion-placeholder">Add tasks or a learning goal to receive intelligent suggestions</p>';
        return;
    }
    
    const suggestions = [];
    const goal = goalInput.value.trim();
    
    // Generate 2-3 suggestions based on tasks and goals
    if (studyTasks.length > 0) {
        // Get random tasks
        const randomTaskIndex = Math.floor(Math.random() * studyTasks.length);
        const randomTask = studyTasks[randomTaskIndex];
        
        // Add task-based suggestion
        const taskSuggestionTemplate = suggestionTemplates[Math.floor(Math.random() * 4)];
        suggestions.push(taskSuggestionTemplate.replace('{task}', randomTask.title)
            .replace('{otherTask}', studyTasks[(randomTaskIndex + 1) % studyTasks.length].title || 'other subjects'));
    }
    
    if (goal) {
        // Add goal-based suggestion
        const goalSuggestionTemplate = suggestionTemplates[4 + Math.floor(Math.random() * 2)];
        suggestions.push(goalSuggestionTemplate.replace('{goal}', goal));
    }
    
    // Add general methodology suggestion
    if (studyTasks.length > 0) {
        const methodSuggestionTemplate = suggestionTemplates[6 + Math.floor(Math.random() * 2)];
        suggestions.push(methodSuggestionTemplate
            .replace('{task}', studyTasks[Math.floor(Math.random() * studyTasks.length)].title)
            .replace('{otherTask}', studyTasks[Math.floor(Math.random() * studyTasks.length)].title));
    }
    
    // Render suggestions
    suggestionsContainer.innerHTML = '';
    suggestions.forEach(suggestion => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'suggestion';
        suggestionElement.textContent = suggestion;
        suggestionsContainer.appendChild(suggestionElement);
    });
}

// Generate study plan based on goal
function generatePlan() {
    const goal = goalInput.value.trim();
    if (!goal) {
        alert('Please enter a learning goal.');
        return;
    }
    
    // Clear existing tasks if user confirms
    if (studyTasks.length > 0) {
        if (!confirm('This will replace your current tasks with a new plan. Continue?')) {
            return;
        }
        studyTasks = [];
    }
    
    // AI-generated plan based on goal
    const keywords = goal.toLowerCase().split(' ');
    const planTemplates = [
        { title: 'Understanding core concepts', duration: 30, priority: 'high' },
        { title: 'Research and exploration', duration: 45, priority: 'medium' },
        { title: 'Practice exercises', duration: 60, priority: 'high' },
        { title: 'Review and note-taking', duration: 30, priority: 'medium' },
        { title: 'Self-assessment quiz', duration: 20, priority: 'low' }
    ];
    
    // Create tasks based on goal
    planTemplates.forEach(template => {
        // Add a keyword from the goal to make it more relevant
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        const title = `${template.title} for ${keyword}`;
        
        studyTasks.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            title,
            priority: template.priority,
            duration: template.duration,
            completed: false
        });
    });
    
    saveData();
    renderTaskList();
    generateSuggestions();
    updateStartButtonState();
}

// Start a study session
function startStudySession() {
    if (studyTasks.length === 0) return;
    
    // Reset session state
    currentSession = {
        active: true,
        currentTaskIndex: 0,
        startTime: new Date(),
        pauseTime: null,
        isPaused: false,
        completedTasks: []
    };
    
    // Show study session UI and hide dashboard
    studySession.classList.remove('hidden');
    document.querySelector('.dashboard').classList.add('hidden');
    
    // Setup current task
    updateCurrentTask();
    startTimer();
}

// Update current task display
function updateCurrentTask() {
    const currentTask = studyTasks[currentSession.currentTaskIndex];
    currentTaskTitle.textContent = currentTask.title;
    
    // Update next task display
    if (currentSession.currentTaskIndex < studyTasks.length - 1) {
        nextTask.textContent = studyTasks[currentSession.currentTaskIndex + 1].title;
    } else {
        nextTask.textContent = 'No more tasks';
    }
}

// Start/resume timer
function startTimer() {
    if (currentSession.isPaused) {
        // Calculate how long it was paused
        const pauseDuration = new Date() - currentSession.pauseTime;
        // Adjust start time to account for pause
        currentSession.startTime = new Date(currentSession.startTime.getTime() + pauseDuration);
        currentSession.isPaused = false;
        pauseBtn.textContent = 'Pause';
    }
    
    const currentTask = studyTasks[currentSession.currentTaskIndex];
    const endTime = new Date(currentSession.startTime.getTime() + currentTask.duration * 60000);
    
    // Update timer every second
    const timerInterval = setInterval(() => {
        if (currentSession.isPaused) {
            clearInterval(timerInterval);
            return;
        }
        
        const now = new Date();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            completeCurrentTask();
            return;
        }
        
        // Format time left as MM:SS
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Pause timer
function togglePause() {
    if (currentSession.isPaused) {
        startTimer();
    } else {
        currentSession.isPaused = true;
        currentSession.pauseTime = new Date();
        pauseBtn.textContent = 'Resume';
    }
}

// Complete current task
function completeCurrentTask() {
    // Add current task to completed tasks
    const completedTask = {
        ...studyTasks[currentSession.currentTaskIndex],
        actualDuration: Math.floor((new Date() - currentSession.startTime) / 60000)
    };
    currentSession.completedTasks.push(completedTask);
    
    // Move to next task or end session
    currentSession.currentTaskIndex++;
    if (currentSession.currentTaskIndex < studyTasks.length) {
        currentSession.startTime = new Date();
        currentSession.isPaused = false;
        updateCurrentTask();
        startTimer();
    } else {
        endStudySession();
    }
}

// End study session
function endStudySession() {
    // Generate session summary
    let summaryHTML = `<h3>Session completed!</h3>
                      <p>Total study time: ${getTotalStudyTime()} minutes</p>
                      <h4>Completed Tasks:</h4>
                      <ul>`;
    
    currentSession.completedTasks.forEach(task => {
        summaryHTML += `<li>
                          <strong>${task.title}</strong> (${task.actualDuration} minutes)
                          ${task.actualDuration > task.duration ? ' - You spent more time than planned!' : ''}
                        </li>`;
    });
    
    summaryHTML += `</ul>
                    <p>Great job! Take some time to rest before your next study session.</p>`;
    
    summaryContent.innerHTML = summaryHTML;
    summaryModal.classList.remove('hidden');
    
    // Reset session
    currentSession.active = false;
    
    // Remove completed tasks
    studyTasks = studyTasks.slice(currentSession.currentTaskIndex);
    saveData();
    renderTaskList();
    updateStartButtonState();
    
    // Hide study session UI
    studySession.classList.add('hidden');
    document.querySelector('.dashboard').classList.remove('hidden');
}

// Calculate total study time
function getTotalStudyTime() {
    return currentSession.completedTasks.reduce((total, task) => total + task.actualDuration, 0);
}

// Close summary modal
function closeSummary() {
    summaryModal.classList.add('hidden');
}

// Clear all tasks
function clearAllTasks() {
    if (confirm('Are you sure you want to clear all tasks?')) {
        studyTasks = [];
        saveData();
        renderTaskList();
        generateSuggestions();
        updateStartButtonState();
    }
}

// Event listeners
addTaskBtn.addEventListener('click', addTask);
generatePlanBtn.addEventListener('click', generatePlan);
startSessionBtn.addEventListener('click', startStudySession);
pauseBtn.addEventListener('click', togglePause);
completeBtn.addEventListener('click', completeCurrentTask);
endSessionBtn.addEventListener('click', endStudySession);
closeSummaryBtn.addEventListener('click', closeSummary);
clearAllBtn.addEventListener('click', clearAllTasks);

// Add keyboard events
taskInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTask();
});

goalInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') generatePlan();
});

// Initialize the application
function init() {
    loadSavedData();
    generateSuggestions();
}

// Start the app
init();