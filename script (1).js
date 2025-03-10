// Application state
let studyTasks = [];
let currentSession = {
    active: false,
    currentTaskIndex: -1,
    startTime: null,
    pauseTime: null,
    isPaused: false,
    completedTasks: [],
    timerInterval: null,
    remainingTime: 0 // Store remaining time in milliseconds
};

// AI suggestion templates
const suggestionTemplates = [
    "Based on your tasks, consider breaking down '{task}' into smaller study segments.",
    "For a more effective session, tackle '{task}' before '{otherTask}' to build foundational knowledge.",
    "To maximize retention, take a 5-minute break after studying '{task}'.",
    "Research shows '{task}' might be better studied in the morning when concentration is higher.",
    "Looking at your goal: '{goal}', consider adding tasks for practical applications.",
    "To reach your goal of '{goal}', add review sessions for previously studied material.",
    "Try the Pomodoro technique (25 min study, 5 min break) for intensive topics like '{task}'.",
    "Alternate between '{task}' and '{otherTask}' to maintain engagement."
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
const statusDiv = document.getElementById('status');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Face Detection Setup
const faceDetection = new FaceDetection({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
});
faceDetection.setOptions({ minDetectionConfidence: 0.6, model: 'short' });
faceDetection.onResults(onResults);
let lastDetectionTime = Date.now();
let pauseTimeout;
let resumeTimeout;

navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(err => {
        console.error('Error accessing webcam:', err);
        statusDiv.textContent = 'Error: Cannot access webcam';
    });

function onResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const detected = results.detections.length > 0;

    if (detected) {
        lastDetectionTime = Date.now();
        statusDiv.textContent = 'Status: Studying';

        // Draw bounding boxes
        results.detections.forEach(detection => {
            const box = detection.boundingBox;
            ctx.beginPath();
            ctx.lineWidth = "2";
            ctx.strokeStyle = "green";
            ctx.rect(box.xCenter - box.width / 2, box.yCenter - box.height / 2, box.width, box.height);
            ctx.stroke();
        });

        // Clear any existing pause timeout
        clearTimeout(pauseTimeout);
        pauseTimeout = null;

        // Resume timer if paused, after 0.5s delay
        if (currentSession.active && currentSession.isPaused) {
            clearTimeout(resumeTimeout);
            resumeTimeout = setTimeout(() => {
                if (Date.now() - lastDetectionTime < 500) { // Verify face still detected
                    resumeTimer();
                    statusDiv.textContent = 'Status: Studying - Timer resumed';
                }
            }, 500);
        }

    } else if (currentSession.active && !currentSession.isPaused) {
        const timeSinceLastDetection = Date.now() - lastDetectionTime;
        
        if (timeSinceLastDetection > 2000 && !pauseTimeout) { // 2 seconds elapsed
            pauseTimer();
            statusDiv.textContent = 'Status: Not studying - Timer paused (No face detected)';
        } else if (!pauseTimeout) { // Schedule pause if not already scheduled
            pauseTimeout = setTimeout(() => {
                if (Date.now() - lastDetectionTime > 2000) {
                    pauseTimer();
                    statusDiv.textContent = 'Status: Not studying - Timer paused (No face detected)';
                }
                pauseTimeout = null;
            }, 2000 - timeSinceLastDetection);
        }
    }
}

async function detectFaces() {
    await faceDetection.send({ image: video });
    requestAnimationFrame(detectFaces);
}

// Load saved data
function loadSavedData() {
    const savedTasks = localStorage.getItem('studyTasks');
    if (savedTasks) {
        studyTasks = JSON.parse(savedTasks);
        renderTaskList();
        updateStartButtonState();
    }
}

// Save data
function saveData() {
    localStorage.setItem('studyTasks', JSON.stringify(studyTasks));
}

// Add task
function addTask() {
    const title = taskInput.value.trim();
    const priority = prioritySelect.value;
    const duration = parseInt(durationInput.value, 10);
    if (!title || isNaN(duration) || duration < 5 || duration > 180) {
        alert('Please enter a valid task and duration (5-180 minutes).');
        return;
    }
    studyTasks.push({ id: Date.now(), title, priority, duration, completed: false });
    taskInput.value = '';
    durationInput.value = '30';
    saveData();
    renderTaskList();
    generateSuggestions();
    updateStartButtonState();
}

// Remove task
function removeTask(id) {
    studyTasks = studyTasks.filter(task => task.id !== id);
    saveData();
    renderTaskList();
    generateSuggestions();
    updateStartButtonState();
}

// Render task list
function renderTaskList() {
    taskList.innerHTML = studyTasks.length === 0 
        ? '<p class="empty-list-message">No tasks yet. Add some to get started!</p>'
        : studyTasks.map(task => `
            <div class="task-item ${task.priority}-priority">
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">Priority: ${task.priority} | Duration: ${task.duration} min</div>
                </div>
                <button class="remove-task-btn" data-id="${task.id}">Remove</button>
            </div>
        `).join('');
    document.querySelectorAll('.remove-task-btn').forEach(btn => 
        btn.addEventListener('click', (e) => removeTask(parseInt(e.target.dataset.id))));
}

// Update start button state
function updateStartButtonState() {
    startSessionBtn.disabled = studyTasks.length === 0;
}

// Generate AI suggestions
function generateSuggestions() {
    suggestionsContainer.innerHTML = (!studyTasks.length && !goalInput.value.trim()) 
        ? '<p class="suggestion-placeholder">Add tasks or a goal to receive suggestions</p>'
        : '';
    const suggestions = [];
    const goal = goalInput.value.trim();

    if (studyTasks.length) {
        const randomTask = studyTasks[Math.floor(Math.random() * studyTasks.length)];
        const otherTask = studyTasks[(studyTasks.indexOf(randomTask) + 1) % studyTasks.length] || randomTask;
        suggestions.push(suggestionTemplates[Math.floor(Math.random() * 4)]
            .replace('{task}', randomTask.title)
            .replace('{otherTask}', otherTask.title));
    }
    if (goal) suggestions.push(suggestionTemplates[4 + Math.floor(Math.random() * 2)].replace('{goal}', goal));
    if (studyTasks.length) suggestions.push(suggestionTemplates[6 + Math.floor(Math.random() * 2)]
        .replace('{task}', studyTasks[Math.floor(Math.random() * studyTasks.length)].title)
        .replace('{otherTask}', studyTasks[Math.floor(Math.random() * studyTasks.length)].title));

    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.className = 'suggestion';
        div.textContent = suggestion;
        suggestionsContainer.appendChild(div);
    });
}

// Generate study plan
function generatePlan() {
    const goal = goalInput.value.trim();
    if (!goal) return alert('Please enter a learning goal.');
    if (studyTasks.length && !confirm('This will replace your current tasks. Continue?')) return;
    studyTasks = [];
    const keywords = goal.toLowerCase().split(' ');
    const planTemplates = [
        { title: 'Core concepts', duration: 30, priority: 'high' },
        { title: 'Research', duration: 45, priority: 'medium' },
        { title: 'Practice', duration: 60, priority: 'high' },
        { title: 'Review', duration: 30, priority: 'medium' },
        { title: 'Quiz', duration: 20, priority: 'low' }
    ];
    planTemplates.forEach(template => {
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        studyTasks.push({
            id: Date.now() + Math.random() * 1000,
            title: `${template.title} for ${keyword}`,
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

// Start study session
function startStudySession() {
    if (!studyTasks.length) return;
    currentSession = { 
        active: true, 
        currentTaskIndex: 0, 
        startTime: new Date(), 
        pauseTime: null, 
        isPaused: false, 
        completedTasks: [], 
        timerInterval: null,
        remainingTime: studyTasks[0].duration * 60000 // Initialize with first task duration
    };
    studySession.classList.remove('hidden');
    updateCurrentTask();
    startTimer();
}

// Update current task
function updateCurrentTask() {
    const currentTask = studyTasks[currentSession.currentTaskIndex];
    currentTaskTitle.textContent = currentTask.title;
    currentSession.remainingTime = currentTask.duration * 60000; // Reset remaining time for new task
    nextTask.textContent = currentSession.currentTaskIndex < studyTasks.length - 1 
        ? studyTasks[currentSession.currentTaskIndex + 1].title : 'No more tasks';
}

// Start/resume timer
function startTimer() {
    if (currentSession.timerInterval) {
        clearInterval(currentSession.timerInterval);
    }
    
    currentSession.timerInterval = setInterval(() => {
        if (currentSession.isPaused) return;
        
        const elapsed = Date.now() - currentSession.startTime;
        currentSession.remainingTime = Math.max(0, (studyTasks[currentSession.currentTaskIndex].duration * 60000) - elapsed);
        
        if (currentSession.remainingTime <= 0) {
            clearInterval(currentSession.timerInterval);
            completeCurrentTask();
            return;
        }
        
        const minutes = Math.floor(currentSession.remainingTime / 60000);
        const seconds = Math.floor((currentSession.remainingTime % 60000) / 1000);
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Pause timer
function pauseTimer() {
    if (currentSession.active && !currentSession.isPaused) {
        clearInterval(currentSession.timerInterval);
        currentSession.isPaused = true;
        currentSession.pauseTime = new Date();
        pauseBtn.textContent = 'Resume';
        clearTimeout(pauseTimeout);
        pauseTimeout = null;
    }
}

// Resume timer
function resumeTimer() {
    if (currentSession.active && currentSession.isPaused) {
        const timePaused = currentSession.pauseTime ? (new Date() - currentSession.pauseTime) : 0;
        currentSession.startTime = new Date(Date.now() - (studyTasks[currentSession.currentTaskIndex].duration * 60000 - currentSession.remainingTime));
        currentSession.isPaused = false;
        currentSession.pauseTime = null;
        pauseBtn.textContent = 'Pause';
        startTimer();
        clearTimeout(resumeTimeout);
    }
}

// Complete current task
function completeCurrentTask() {
    const completedTask = { 
        ...studyTasks[currentSession.currentTaskIndex], 
        actualDuration: Math.floor((studyTasks[currentSession.currentTaskIndex].duration * 60000 - currentSession.remainingTime) / 60000) 
    };
    currentSession.completedTasks.push(completedTask);
    currentSession.currentTaskIndex++;
    if (currentSession.currentTaskIndex < studyTasks.length) {
        updateCurrentTask();
        startTimer();
    } else {
        endStudySession();
    }
}

// End study session
function endStudySession() {
    clearInterval(currentSession.timerInterval);
    let summaryHTML = `<h3>Session Completed!</h3><p>Total time: ${getTotalStudyTime()} min</p><h4>Completed Tasks:</h4><ul>`;
    currentSession.completedTasks.forEach(task => summaryHTML += `<li><strong>${task.title}</strong> (${task.actualDuration} min)</li>`);
    summaryHTML += '</ul><p>Great job! Take a break before your next session.</p>';
    summaryContent.innerHTML = summaryHTML;
    summaryModal.classList.remove('hidden');
    currentSession.active = false;
    studyTasks = studyTasks.slice(currentSession.currentTaskIndex);
    saveData();
    renderTaskList();
    updateStartButtonState();
    studySession.classList.add('hidden');
}

// Calculate total study time
function getTotalStudyTime() {
    return currentSession.completedTasks.reduce((total, task) => total + task.actualDuration, 0);
}

// Close summary
function closeSummary() {
    summaryModal.classList.add('hidden');
}

// Clear all tasks
function clearAllTasks() {
    if (confirm('Clear all tasks?')) {
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
pauseBtn.addEventListener('click', () => currentSession.isPaused ? resumeTimer() : pauseTimer());
completeBtn.addEventListener('click', completeCurrentTask);
endSessionBtn.addEventListener('click', endStudySession);
closeSummaryBtn.addEventListener('click', closeSummary);
clearAllBtn.addEventListener('click', clearAllTasks);
taskInput.addEventListener('keypress', (e) => e.key === 'Enter' && addTask());
goalInput.addEventListener('keypress', (e) => e.key === 'Enter' && generatePlan());
video.addEventListener('play', detectFaces);

// Initialize
function init() {
    loadSavedData();
    generateSuggestions();
}
init();