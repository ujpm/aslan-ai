// Shared validation rules between frontend and backend

const ValidationRules = {
    // User validation
    user: {
        username: {
            minLength: 3,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9_-]+$/,
            message: 'Username must be between 3-50 characters and can only contain letters, numbers, underscores, and hyphens'
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address'
        },
        password: {
            minLength: 8,
            pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]+$/,
            message: 'Password must be at least 8 characters and contain both letters and numbers'
        }
    },

    // Message validation
    message: {
        content: {
            maxLength: 2000,
            minLength: 1,
            message: 'Message must be between 1-2000 characters'
        }
    },

    // Token validation
    tokens: {
        maxMonthlyLimit: 100000,
        warningThreshold: 0.8, // 80% of limit
        criticalThreshold: 0.95 // 95% of limit
    },

    // Session validation
    session: {
        maxDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        inactivityTimeout: 30 * 60 * 1000 // 30 minutes in milliseconds
    }
};

// Validation helper functions
const Validators = {
    validateUser: (userData) => {
        const errors = {};
        
        // Validate username
        if (!userData.username || 
            userData.username.length < ValidationRules.user.username.minLength ||
            userData.username.length > ValidationRules.user.username.maxLength ||
            !ValidationRules.user.username.pattern.test(userData.username)) {
            errors.username = ValidationRules.user.username.message;
        }

        // Validate email
        if (!userData.email || !ValidationRules.user.email.pattern.test(userData.email)) {
            errors.email = ValidationRules.user.email.message;
        }

        // Validate password
        if (!userData.password || 
            userData.password.length < ValidationRules.user.password.minLength ||
            !ValidationRules.user.password.pattern.test(userData.password)) {
            errors.password = ValidationRules.user.password.message;
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    validateMessage: (content) => {
        if (!content || 
            content.length < ValidationRules.message.content.minLength ||
            content.length > ValidationRules.message.content.maxLength) {
            return {
                isValid: false,
                error: ValidationRules.message.content.message
            };
        }
        return {
            isValid: true,
            error: null
        };
    },

    validateTokenUsage: (used, limit) => {
        const usage = used / limit;
        return {
            isValid: used <= limit,
            warning: usage >= ValidationRules.tokens.warningThreshold,
            critical: usage >= ValidationRules.tokens.criticalThreshold,
            remaining: limit - used
        };
    },

    validateSession: (startTime) => {
        const now = new Date().getTime();
        const sessionDuration = now - new Date(startTime).getTime();
        
        return {
            isValid: sessionDuration <= ValidationRules.session.maxDuration,
            remaining: Math.max(0, ValidationRules.session.maxDuration - sessionDuration)
        };
    }
};

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ValidationRules, Validators };
} else {
    window.ValidationRules = ValidationRules;
    window.Validators = Validators;
}
