
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements for user login/signup
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const signupSubmitBtn = document.getElementById('signupSubmitBtn');
    const successMessage = document.getElementById('successMessage');
    const messageText = document.getElementById('messageText');

    // Only run if we're on the user login page
    if (loginBtn && signupBtn) {
        let activeForm = 'login';

        // Switch to Login Form
        function showLoginForm() {
            loginBtn.classList.add('active');
            signupBtn.classList.remove('active');
            
            loginForm.classList.remove('inactive-left');
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            signupForm.classList.add('inactive-right');
            
            activeForm = 'login';
            hideSuccessMessage();
        }

        // Switch to Signup Form
        function showSignupForm() {
            signupBtn.classList.add('active');
            loginBtn.classList.remove('active');
            
            signupForm.classList.remove('inactive-right');
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
            loginForm.classList.add('inactive-left');
            
            activeForm = 'signup';
            hideSuccessMessage();
        }

        // Show success message
        function showSuccessMessage(text) {
            if (messageText) {
                messageText.textContent = text;
                successMessage.style.display = 'flex';
                setTimeout(hideSuccessMessage, 5000);
            }
        }

        // Hide success message
        function hideSuccessMessage() {
            if (successMessage) {
                successMessage.style.display = 'none';
            }
        }

        // Simulate form submission
        function simulateFormSubmission(button, message) {
            button.classList.add('loading');
            button.disabled = true;
            
            setTimeout(() => {
                button.classList.remove('loading');
                button.disabled = false;
                showSuccessMessage(message);
            }, 1500);
        }

        // Event Listeners
        if (loginBtn) loginBtn.addEventListener('click', showLoginForm);
        if (signupBtn) signupBtn.addEventListener('click', showSignupForm);
        if (switchToSignup) switchToSignup.addEventListener('click', showSignupForm);
        if (switchToLogin) switchToLogin.addEventListener('click', showLoginForm);

        // Form Submissions
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail')?.value;
                const password = document.getElementById('loginPassword')?.value;
                
                if (email && password) {
                    simulateFormSubmission(loginSubmitBtn, 'Login successful! Redirecting...');
                    console.log('Login attempt:', { email, password });
                }
            });
        }

        if (signupForm) {
            signupForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const name = document.getElementById('signupName')?.value;
                const email = document.getElementById('signupEmail')?.value;
                const password = document.getElementById('signupPassword')?.value;
                const confirmPassword = document.getElementById('confirmPassword')?.value;
                
                if (password !== confirmPassword) {
                    alert('Passwords do not match!');
                    return;
                }
                
                if (password && password.length < 8) {
                    alert('Password must be at least 8 characters long!');
                    return;
                }
                
                if (name && email && password) {
                    simulateFormSubmission(signupSubmitBtn, 'Account created successfully! Check your email for verification.');
                    console.log('Signup attempt:', { name, email, password });
                }
            });
        }

        // Social Login Buttons
        document.querySelectorAll('.google-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                simulateFormSubmission(this, 'Redirecting to Google authentication...');
            });
        });

        // Initialize with login form
        showLoginForm();
    }

    // Provider login form handling
    const providerLoginForm = document.getElementById('providerLoginForm');
    if (providerLoginForm) {
        providerLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('providerEmail')?.value;
            const password = document.getElementById('providerPassword')?.value;
            const submitBtn = document.getElementById('providerSubmitBtn');
            
            if (email && password && submitBtn) {
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Logging in...';
                submitBtn.disabled = true;
                
                setTimeout(() => {
                    alert('Provider login successful! This would connect to your backend API.');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }, 1500);
            }
        });
    }

    // Forgot password links
    document.querySelectorAll('.forget-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Password reset functionality would be implemented here. A reset link would be sent to your email.');
        });
    });
});