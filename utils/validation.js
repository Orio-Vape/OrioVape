function validateEmail(email) {
    if (!email.endsWith('@gmail.com')) {
        throw new Error('Only Gmail addresses are allowed');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }
}

function validatePassword(password) {
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }
    
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    
    if (!hasNumber || !hasLetter) {
        throw new Error('Password must contain both letters and numbers');
    }
}

function validateUsername(username) {
    if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
    }
}
