// Client-side form handling for login_page.html
(function(){
  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const toggle = document.getElementById('togglePwd');

  function validateEmail(v){
    // simple email regex
    return /\S+@\S+\.\S+/.test(v);
  }

  toggle.addEventListener('click', ()=>{
    const type = password.type === 'password' ? 'text' : 'password';
    password.type = type;
    toggle.textContent = type === 'password' ? 'Show' : 'Hide';
    toggle.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    let ok = true;
    emailError.textContent = '';
    passwordError.textContent = '';

    if(!email.value.trim()){
      emailError.textContent = 'Email is required';
      ok = false;
    } else if(!validateEmail(email.value.trim())){
      emailError.textContent = 'Enter a valid email address';
      ok = false;
    }

    if(!password.value){
      passwordError.textContent = 'Password is required';
      ok = false;
    } else if(password.value.length < 6){
      passwordError.textContent = 'Password must be at least 6 characters';
      ok = false;
    }

    if(!ok) return;

    // Simulate submission — in a real app, POST to the server here
    const payload = {
      email: email.value.trim(),
      password: password.value,
      remember: !!document.getElementById('remember').checked,
    };

    // tiny success feedback
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    setTimeout(()=>{
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
      alert('Mock sign-in successful for: ' + payload.email + '\n(This is a demo — wire up your backend to proceed)');
      form.reset();
    }, 900);
  });
})();
