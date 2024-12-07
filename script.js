// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const moodButtons = document.querySelectorAll('.mood-btn');
const breathingModal = document.querySelector('.breathing-modal');
const closeModalBtn = document.querySelector('.close-modal');
const supportTools = document.querySelector('.support-tools');
const closeToolsBtn = document.querySelector('.close-tools');
const toolButtons = document.querySelectorAll('.tool-btn');
const themeToggle = document.querySelector('.theme-toggle');

// State Management
let currentMood = null;
let isBreathingExerciseActive = false;
let typingTimeout = null;

// Chat Message Templates
const createMessage = (content, isUser = false) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const text = document.createElement('p');
    text.textContent = content;
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = 'Just now';
    
    messageContent.appendChild(text);
    messageContent.appendChild(time);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    return messageDiv;
};

// Typing Indicator
const createTypingIndicator = () => {
    const indicator = document.createElement('div');
    indicator.className = 'message ai-message typing-indicator';
    indicator.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <p>Aslan is typing...</p>
        </div>
    `;
    return indicator;
};

// AI Response Generation
const generateAIResponse = async (userMessage) => {
    // Simulate AI thinking time
    const thinkingTime = Math.random() * 2000 + 1000;
    
    // Sample responses based on message content
    const responses = {
        greeting: [
            "Hello! How can I support you today?",
            "Hi there! I'm here to listen and help.",
            "Welcome! How are you feeling right now?"
        ],
        mood: {
            great: "I'm glad you're feeling great! What's contributing to your positive mood?",
            good: "That's good to hear! Would you like to share what's going well?",
            okay: "Thank you for sharing. Would you like to talk about what's on your mind?",
            bad: "I'm here to support you. Would you like to talk about what's troubling you?",
            terrible: "I'm sorry you're feeling this way. Let's work through this together. What's happening?"
        },
        default: [
            "I hear you. Can you tell me more about that?",
            "Thank you for sharing. How does that make you feel?",
            "I understand. What support do you need right now?",
            "I'm here to listen. Would you like to explore this further?"
        ]
    };

    // Simple response selection logic
    let response;
    const lowercaseMessage = userMessage.toLowerCase();
    
    if (lowercaseMessage.includes('hello') || lowercaseMessage.includes('hi')) {
        response = responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    } else if (currentMood) {
        response = responses.mood[currentMood];
        currentMood = null;
    } else {
        response = responses.default[Math.floor(Math.random() * responses.default.length)];
    }

    return new Promise(resolve => setTimeout(() => resolve(response), thinkingTime));
};

// Message Handling
const addMessage = (content, isUser = false) => {
    const message = createMessage(content, isUser);
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
};

const handleMessageSubmit = async () => {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, true);
    messageInput.value = '';
    
    // Show typing indicator
    const typingIndicator = createTypingIndicator();
    chatMessages.appendChild(typingIndicator);
    
    // Get and display AI response
    const response = await generateAIResponse(message);
    chatMessages.removeChild(typingIndicator);
    addMessage(response);
};

// Breathing Exercise
const startBreathingExercise = () => {
    breathingModal.style.display = 'flex';
    isBreathingExerciseActive = true;
    
    const circle = document.querySelector('.breathing-circle');
    const instruction = document.querySelector('.breathing-instruction');
    
    const breathingCycle = () => {
        if (!isBreathingExerciseActive) return;
        
        // Inhale
        instruction.textContent = 'Breathe in...';
        circle.style.transform = 'scale(1.2)';
        circle.style.transition = 'transform 4s ease-in';
        
        setTimeout(() => {
            if (!isBreathingExerciseActive) return;
            // Hold
            instruction.textContent = 'Hold...';
            
            setTimeout(() => {
                if (!isBreathingExerciseActive) return;
                // Exhale
                instruction.textContent = 'Breathe out...';
                circle.style.transform = 'scale(1)';
                circle.style.transition = 'transform 4s ease-out';
                
                setTimeout(() => {
                    if (!isBreathingExerciseActive) return;
                    // Repeat
                    breathingCycle();
                }, 4000);
            }, 4000);
        }, 4000);
    };
    
    breathingCycle();
};

const stopBreathingExercise = () => {
    isBreathingExerciseActive = false;
    breathingModal.style.display = 'none';
};

// Dark Mode Toggle
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Check for saved theme preference or use system preference
const currentTheme = localStorage.getItem('theme') || 
    (prefersDarkScheme.matches ? 'dark' : 'light');

// Set initial theme
document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeIcon(currentTheme);

// Theme toggle click handler
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

// Update theme icon
function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

// Event Listeners
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMessageSubmit();
    }
});

sendButton.addEventListener('click', handleMessageSubmit);

messageInput.addEventListener('input', () => {
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
});

moodButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentMood = button.dataset.mood;
        addMessage(`I'm feeling ${currentMood}`, true);
        
        // Show typing indicator
        const typingIndicator = createTypingIndicator();
        chatMessages.appendChild(typingIndicator);
        
        // Get and display AI response
        setTimeout(async () => {
            const response = await generateAIResponse('mood_update');
            chatMessages.removeChild(typingIndicator);
            addMessage(response);
        }, 1000);
    });
});

toolButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const tool = e.currentTarget.querySelector('span').textContent;
        if (tool === 'Breathing Exercise') {
            startBreathingExercise();
        }
        // Add other tool handlers here
    });
});

closeModalBtn.addEventListener('click', stopBreathingExercise);
closeToolsBtn.addEventListener('click', () => {
    supportTools.classList.remove('active');
});

// Initial greeting
window.addEventListener('load', () => {
    setTimeout(() => {
        addMessage("Hello! I'm Aslan, your emotional support companion. How are you feeling today?");
    }, 500);
});

// Mobile responsiveness
document.querySelector('.fa-bars')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('active');
});

// Keyboard accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        stopBreathingExercise();
        supportTools.classList.remove('active');
    }
});
