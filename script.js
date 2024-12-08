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
const authModal = document.getElementById('authModal');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');

// State Management
let currentUser = null;
let currentSession = null;
let sessionTokens = 0;
let monthlyTokenLimit = 1000; // Default value, will be updated from backend
let socket = null;

// WebSocket Connection
const initializeWebSocket = () => {
    socket = new WebSocket('ws://localhost:8080');
    
    socket.onopen = () => {
        console.log('WebSocket connected');
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
    };
};

const handleWebSocketMessage = (data) => {
    switch (data.type) {
        case 'alert':
            handleAlert(data.payload);
            break;
        case 'token_update':
            updateTokenUsage(data.payload);
            break;
        case 'emotion_analysis':
            updateMessageEmotion(data.payload);
            break;
    }
};

// Session Management
const startNewSession = async () => {
    try {
        const response = await fetch('/api/sessions/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                start_time: new Date().toISOString()
            })
        });
        
        const session = await response.json();
        currentSession = session;
        sessionStart = new Date(session.start_time);
        updateSessionInfo();
    } catch (error) {
        console.error('Failed to start session:', error);
    }
};

const endSession = async () => {
    if (!currentSession) return;
    
    try {
        await fetch(`/api/sessions/${currentSession.id}/end`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                end_time: new Date().toISOString(),
                token_consumed: sessionTokens
            })
        });
    } catch (error) {
        console.error('Failed to end session:', error);
    }
};

// Chat Message Templates
const createMessage = (content, isUser = false, emotion = null, colorFlag = null) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const messageData = {
        session_id: currentSession.id,
        user_id: currentUser.id,
        message_text: content,
        message_type: isUser ? 'user' : 'ai',
        emotion_label: emotion,
        color_flag: colorFlag
    };
    
    // Save message to backend
    saveMessage(messageData);
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    if (emotion) messageContent.dataset.emotion = emotion;
    if (colorFlag) messageContent.dataset.colorFlag = colorFlag;
    
    const text = document.createElement('p');
    text.textContent = content;
    
    const metadata = document.createElement('div');
    metadata.className = 'message-metadata';
    metadata.innerHTML = `
        ${emotion ? `<span class="emotion-tag" data-emotion="${emotion}">
            <i class="fas ${getEmotionIcon(emotion)}"></i> ${emotion}
        </span>` : ''}
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    `;
    
    messageContent.appendChild(text);
    messageContent.appendChild(metadata);
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
const addMessage = async (content, isUser = false) => {
    try {
        // First, validate message on the backend
        const validationResponse = await fetch('/api/messages/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ content })
        });
        
        const validationData = await validationResponse.json();
        
        if (!validationData.valid) {
            throw new Error(validationData.error);
        }
        
        // Create message with backend-provided data
        const messageDiv = createMessage(content, isUser, validationData.emotion, validationData.colorFlag);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Update tokens based on backend calculation
        updateTokenUsage(validationData.totalTokens);
        
    } catch (error) {
        console.error('Failed to add message:', error);
        // Show error to user
        showNotification('Error sending message. Please try again.', 'error');
    }
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

// Token Management
const updateTokenUsage = async (tokensUsed) => {
    try {
        const response = await fetch('/api/token-usage', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        monthlyTokenLimit = data.monthly_token_limit;
        sessionTokens = tokensUsed;
        
        const tokenBar = document.querySelector('.token-bar');
        const tokenText = document.querySelector('.token-text');
        
        if (tokenBar && tokenText) {
            const percentage = (tokensUsed / monthlyTokenLimit) * 100;
            tokenBar.style.width = `${Math.min(percentage, 100)}%`;
            tokenText.textContent = `${tokensUsed}/${monthlyTokenLimit} tokens`;
            
            // Update token bar color based on usage
            if (percentage > 90) {
                tokenBar.style.backgroundColor = 'var(--error-color)';
            } else if (percentage > 70) {
                tokenBar.style.backgroundColor = 'var(--warning-color)';
            }
        }
    } catch (error) {
        console.error('Failed to update token usage:', error);
    }
};

// Alert System
const checkForAlerts = async (messageData) => {
    const severity = assessMessageSeverity(messageData);
    
    if (severity.needsAlert) {
        try {
            await fetch('/api/alerts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: currentSession.id,
                    chat_history_id: messageData.id,
                    user_id: currentUser.id,
                    alert_type: severity.type,
                    alert_description: severity.description,
                    alert_time: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Failed to create alert:', error);
        }
    }
};

// Helper Functions
const determineColorFlag = (emotion) => {
    const severityMap = {
        'angry': 'red',
        'sad': 'yellow',
        'anxious': 'yellow',
        'calm': 'green',
        'happy': 'green'
    };
    return severityMap[emotion] || 'green';
};

const assessMessageSeverity = (messageData) => {
    const highRiskKeywords = ['suicide', 'kill', 'die', 'end it all'];
    const mediumRiskEmotions = ['angry', 'sad', 'anxious'];
    
    const hasHighRiskKeywords = highRiskKeywords.some(keyword => 
        messageData.message_text.toLowerCase().includes(keyword)
    );
    
    if (hasHighRiskKeywords) {
        return {
            needsAlert: true,
            type: 'crisis',
            description: 'High-risk keywords detected in user message'
        };
    }
    
    if (mediumRiskEmotions.includes(messageData.emotion_label)) {
        return {
            needsAlert: true,
            type: 'high_emotion',
            description: `User showing signs of ${messageData.emotion_label} emotion`
        };
    }
    
    return { needsAlert: false };
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

// Support Tools Toggle
document.addEventListener('DOMContentLoaded', function() {
    const supportToolsToggle = document.querySelector('.support-tools-toggle');
    const supportTools = document.querySelector('.support-tools');
    
    if (supportToolsToggle && supportTools) {
        supportToolsToggle.addEventListener('click', function() {
            supportTools.classList.toggle('active');
        });
    }
});

// Auth Modal Functionality
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetForm = tab.dataset.tab;
        
        // Update active tab
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show target form
        authForms.forEach(form => {
            form.classList.remove('active');
            if (form.id === `${targetForm}Form`) {
                form.classList.add('active');
            }
        });
    });
});

// Session Tracking
function updateSessionInfo() {
    if (!sessionStart) {
        sessionStart = new Date();
    }
    
    const sessionTime = document.querySelector('.session-time');
    const sessionTokenDisplay = document.querySelector('.session-tokens');
    const tokenBar = document.querySelector('.token-bar');
    const tokenText = document.querySelector('.token-text');
    
    // Update session duration
    const now = new Date();
    const duration = Math.floor((now - sessionStart) / 1000);
    const hours = Math.floor(duration / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((duration % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
    
    sessionTime.textContent = `Session Duration: ${hours}:${minutes}:${seconds}`;
    sessionTokenDisplay.textContent = `Session Tokens: ${sessionTokens}`;
    
    // Update token usage (example values)
    const tokenLimit = 1000;
    const tokensUsed = sessionTokens;
    const tokenPercentage = (tokensUsed / tokenLimit) * 100;
    
    tokenBar.style.width = `${tokenPercentage}%`;
    tokenText.textContent = `${tokensUsed}/${tokenLimit} tokens`;
}

setInterval(updateSessionInfo, 1000);

// Emotion Detection
function detectEmotion(text) {
    // Simple example - would be replaced with actual sentiment analysis
    const lowerText = text.toLowerCase();
    if (lowerText.includes('anxious') || lowerText.includes('worried')) return 'Anxious';
    if (lowerText.includes('happy') || lowerText.includes('great')) return 'Happy';
    if (lowerText.includes('sad') || lowerText.includes('depressed')) return 'Sad';
    if (lowerText.includes('angry') || lowerText.includes('frustrated')) return 'Angry';
    return 'Neutral';
}

function getEmotionIcon(emotion) {
    const icons = {
        'Anxious': 'fa-wind',
        'Happy': 'fa-smile',
        'Sad': 'fa-frown',
        'Angry': 'fa-angry',
        'Neutral': 'fa-meh',
        'Supportive': 'fa-heart'
    };
    return icons[emotion] || 'fa-meh';
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

// Team Carousel
function initTeamCarousel() {
    const carousel = document.querySelector('.team-members');
    const members = Array.from(document.querySelectorAll('.team-member'));
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');
    const dotsContainer = document.querySelector('.carousel-dots');
    
    let currentIndex = 0;
    let autoplayInterval;
    const autoplayDelay = 5000;
    
    // Calculate items per view based on viewport width
    const getItemsPerView = () => {
        const viewportWidth = window.innerWidth;
        if (viewportWidth < 480) return 1;
        if (viewportWidth < 768) return 2;
        return 5;
    };
    
    let itemsPerView = getItemsPerView();
    
    // Create dots
    const createDots = () => {
        dotsContainer.innerHTML = '';
        const numDots = Math.ceil(members.length / itemsPerView);
        
        for (let i = 0; i < numDots; i++) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
        updateDots();
    };
    
    // Update dots
    const updateDots = () => {
        const dots = Array.from(dotsContainer.children);
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    };
    
    // Slide to position
    const goToSlide = (index) => {
        const maxIndex = Math.ceil(members.length / itemsPerView) - 1;
        currentIndex = Math.max(0, Math.min(index, maxIndex));
        
        const slideWidth = members[0].offsetWidth + parseFloat(getComputedStyle(members[0]).marginRight);
        const offset = -currentIndex * (slideWidth * itemsPerView);
        
        carousel.style.transform = `translateX(${offset}px)`;
        updateDots();
    };
    
    // Next slide
    const nextSlide = () => {
        goToSlide(currentIndex + 1);
    };
    
    // Previous slide
    const prevSlide = () => {
        goToSlide(currentIndex - 1);
    };
    
    // Start autoplay
    const startAutoplay = () => {
        stopAutoplay();
        autoplayInterval = setInterval(nextSlide, autoplayDelay);
    };
    
    // Stop autoplay
    const stopAutoplay = () => {
        if (autoplayInterval) {
            clearInterval(autoplayInterval);
            autoplayInterval = null;
        }
    };
    
    // Event listeners
    prevBtn.addEventListener('click', () => {
        prevSlide();
        stopAutoplay();
    });
    
    nextBtn.addEventListener('click', () => {
        nextSlide();
        stopAutoplay();
    });
    
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const newItemsPerView = getItemsPerView();
        if (newItemsPerView !== itemsPerView) {
            itemsPerView = newItemsPerView;
            createDots();
            goToSlide(0);
        }
    });
    
    // Initialize
    createDots();
    startAutoplay();
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeWebSocket();
    initTeamCarousel();
});
