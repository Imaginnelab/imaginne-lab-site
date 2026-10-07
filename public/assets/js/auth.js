(() => {
  const translations = {
    pt: {
      login: 'Entrar', signup: 'Criar conta', account: 'Minha conta', close: 'Fechar',
      name: 'Nome', email: 'E-mail', password: 'Senha', confirm: 'Confirme a senha',
      invitation: 'Não tem uma conta?', register: 'Cadastre-se', back: 'Já tenho uma conta',
      wait: 'Aguarde…', logout: 'Sair', admin: 'Painel admin', mismatch: 'As senhas não coincidem.',
      nameRequired: 'Informe seu nome.', hint: 'Use pelo menos 8 caracteres.',
      accountCreated: 'Conta criada com sucesso! Entre com seu e-mail e senha.',
      exists: 'Este e-mail já está cadastrado. Clique em “Já tenho uma conta” para entrar.',
      signupDisabled: 'O cadastro de novas contas está temporariamente desativado.',
      invalidEmail: 'Informe um endereço de e-mail válido.',
      serverError: 'O serviço não conseguiu concluir o cadastro. Tente novamente mais tarde.',
      profileError: 'Não foi possível consultar as permissões da sua conta. Feche e abra este popup para tentar novamente.',
      checkEmail: 'Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Confira sua caixa de entrada.',
      unavailable: 'O acesso à conta está temporariamente indisponível. Tente novamente mais tarde.',
      generic: 'Não foi possível concluir. Confira os dados e tente novamente.',
      credentials: 'E-mail ou senha incorretos.', unconfirmed: 'Confirme seu e-mail antes de entrar.',
      weak: 'A senha não atende aos requisitos de segurança. Use uma senha mais forte.',
      rate: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      emailRate: 'O limite temporário de envio de e-mails foi atingido. Aguarde a liberação do serviço antes de tentar cadastrar novamente.',
    },
    en: {
      login: 'Sign in', signup: 'Create account', account: 'My account', close: 'Close',
      name: 'Name', email: 'Email', password: 'Password', confirm: 'Confirm password',
      invitation: 'Don’t have an account?', register: 'Sign up', back: 'I already have an account',
      wait: 'Please wait…', logout: 'Sign out', admin: 'Admin dashboard', mismatch: 'Passwords do not match.',
      nameRequired: 'Enter your name.', hint: 'Use at least 8 characters.',
      accountCreated: 'Account created successfully! Sign in with your email and password.',
      exists: 'This email is already registered. Click “I already have an account” to sign in.',
      signupDisabled: 'New account registration is temporarily disabled.',
      invalidEmail: 'Enter a valid email address.',
      serverError: 'The service could not complete registration. Please try again later.',
      profileError: 'Unable to check your account permissions. Close and reopen this popup to try again.',
      checkEmail: 'If registration can be completed, you will receive a confirmation email. Check your inbox.',
      unavailable: 'Account access is temporarily unavailable. Please try again later.',
      generic: 'Unable to complete the request. Check your details and try again.',
      credentials: 'Incorrect email or password.', unconfirmed: 'Confirm your email before signing in.',
      weak: 'This password does not meet the security requirements. Use a stronger password.',
      rate: 'Too many attempts. Wait a few minutes and try again.',
      emailRate: 'The temporary email sending limit has been reached. Wait for the service limit to reset before trying to sign up again.',
    },
    es: {
      login: 'Entrar', signup: 'Crear cuenta', account: 'Mi cuenta', close: 'Cerrar',
      name: 'Nombre', email: 'Correo electrónico', password: 'Contraseña', confirm: 'Confirmar contraseña',
      invitation: '¿No tienes una cuenta?', register: 'Regístrate', back: 'Ya tengo una cuenta',
      wait: 'Espera…', logout: 'Cerrar sesión', admin: 'Panel admin', mismatch: 'Las contraseñas no coinciden.',
      nameRequired: 'Introduce tu nombre.', hint: 'Usa al menos 8 caracteres.',
      accountCreated: '¡Cuenta creada correctamente! Inicia sesión con tu correo y contraseña.',
      exists: 'Este correo ya está registrado. Haz clic en “Ya tengo una cuenta” para entrar.',
      signupDisabled: 'El registro de nuevas cuentas está desactivado temporalmente.',
      invalidEmail: 'Introduce una dirección de correo válida.',
      serverError: 'El servicio no pudo completar el registro. Inténtalo más tarde.',
      profileError: 'No se pudieron consultar los permisos de tu cuenta. Cierra y vuelve a abrir esta ventana para intentarlo de nuevo.',
      checkEmail: 'Si se puede completar el registro, recibirás un correo de confirmación. Revisa tu bandeja de entrada.',
      unavailable: 'El acceso a la cuenta no está disponible temporalmente. Inténtalo más tarde.',
      generic: 'No se pudo completar la solicitud. Revisa tus datos e inténtalo de nuevo.',
      credentials: 'Correo o contraseña incorrectos.', unconfirmed: 'Confirma tu correo antes de entrar.',
      weak: 'La contraseña no cumple los requisitos de seguridad. Usa una más segura.',
      rate: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      emailRate: 'Se ha alcanzado el límite temporal de envío de correos. Espera a que se restablezca antes de intentar registrarte de nuevo.',
    },
  };
  const t = translations[document.documentElement.lang.split('-')[0]] || translations.en;
  const trigger = document.querySelector('[data-auth-open]');
  if (!trigger) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'auth-dialog';
  dialog.id = 'auth-dialog';
  dialog.setAttribute('aria-labelledby', 'auth-title');
  dialog.innerHTML = `
    <button type="button" class="auth-close" aria-label="${t.close}">×</button>
    <p class="eyebrow">Imaginne Lab</p>
    <h2 id="auth-title"></h2>
    <div class="auth-toast" role="status" aria-live="polite" aria-atomic="true" hidden><button type="button"><span></span><span aria-hidden="true">×</span></button></div>
    <form class="auth-form">
      <fieldset>
        <label data-registration>${t.name}<input name="name" autocomplete="name" maxlength="100"></label>
        <label>${t.email}<input name="email" type="email" autocomplete="email" required></label>
        <label>${t.password}<input name="password" type="password" required autocomplete="current-password"></label>
        <small data-registration id="auth-password-hint">${t.hint}</small>
        <label data-registration>${t.confirm}<input name="confirm" type="password" autocomplete="new-password"></label>
        <button class="btn btn-primary" type="submit"></button>
      </fieldset>
    </form>
    <div class="auth-account" hidden><div class="auth-identity"><span class="auth-avatar" aria-hidden="true"></span><div><p class="auth-full-name"></p><p class="auth-email"></p></div></div><div class="auth-account-actions"><a class="btn btn-primary auth-admin" hidden><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 5h7v8H4zM13 5h7v5h-7zM13 12h7v7h-7zM4 15h7v4H4z"/></svg><span>${t.admin}</span></a><button class="btn btn-ghost" type="button">${t.logout}</button></div></div>
    <p class="auth-message" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="auth-switch"><span></span> <button type="button"></button></p>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const fields = form.elements;
  const submit = form.querySelector('[type=submit]');
  const switcher = dialog.querySelector('.auth-switch button');
  const message = dialog.querySelector('.auth-message');
  const account = dialog.querySelector('.auth-account');
  const toast = dialog.querySelector('.auth-toast');
  let toastTimer;
  function dismissToast() {
    clearTimeout(toastTimer);
    toast.hidden = true;
    toast.querySelector('span').textContent = '';
  }
  function showToast(text) {
    dismissToast();
    toast.hidden = false;
    toast.querySelector('span').textContent = text;
    toast.querySelector('button').setAttribute('aria-label', `${text} — ${t.close}`);
    toastTimer = setTimeout(dismissToast, 5000);
  }
  toast.querySelector('button').addEventListener('click', dismissToast);
  let mode = 'login';
  let busy = false;
  let session = null;
  let profile = null;
  let profileFailed = false;
  let profileVersion = 0;
  let profileHelpers;
  let authKnown = false;
  let authFailed = false;
  const helpersPromise = import('/assets/js/account-profile.js').then(module => { profileHelpers = module; render(); return module; });
  const adminLink = account.querySelector('.auth-admin');
  adminLink.href = '/admin/?lang=' + document.documentElement.lang.split('-')[0];
  // Shortcut to the dashboard beside the avatar, for administrators only. It is a convenience:
  // the dashboard itself checks the account again on the server.
  const shortcut = document.createElement('a');
  shortcut.className = 'auth-admin-shortcut';
  shortcut.href = adminLink.href;
  shortcut.title = t.admin;
  shortcut.setAttribute('aria-label', t.admin);
  shortcut.hidden = true;
  shortcut.append(adminLink.querySelector('svg').cloneNode(true));
  trigger.before(shortcut);
  let clientPromise;
  function status(text = '', error = false) {
    message.textContent = text;
    message.classList.toggle('is-error', error);
  }
  function render() {
    const registration = mode === 'signup';
    form.classList.toggle('is-registration', registration);
    dialog.querySelector('#auth-title').textContent = session ? t.account : registration ? t.signup : t.login;
    const name = profileHelpers?.fullName(profile, session?.user) || '';
    const initials = session ? (profileHelpers?.initials(name) || '?') : '';
    trigger.querySelector('span').textContent = session ? initials : t.login;
    // The <head> script paints a predicted avatar (html[data-auth="pending"]) from these hints;
    // release it once the real state, including the profile name, is known.
    if (authKnown && (!session || profile || profileFailed)) {
      try {
        if (session && profileHelpers) localStorage.setItem('imaginne-auth-initials', initials);
        else if (!session && !authFailed) localStorage.removeItem('imaginne-auth-initials');
      } catch { /* storage unavailable */ }
      document.documentElement.removeAttribute('data-auth');
    }
    trigger.classList.toggle('is-authenticated', !!session);
    trigger.setAttribute('aria-label', session ? `${t.account}${name ? ': ' + name : ''}` : t.login);
    trigger.title = session ? name || t.account : t.login;
    form.hidden = !!session;
    account.hidden = !session;
    account.querySelector('.auth-full-name').textContent = name;
    account.querySelector('.auth-email').textContent = session?.user?.email || '';
    adminLink.hidden = !session || profile?.isadmin !== true;
    shortcut.hidden = adminLink.hidden;
    account.querySelector('.auth-avatar').textContent = initials;
    dialog.querySelector('.auth-switch').hidden = !!session;
    dialog.querySelectorAll('[data-registration]').forEach(el => { el.hidden = !registration; });
    fields.namedItem('name').required = registration;
    fields.namedItem('name').disabled = !registration;
    fields.namedItem('confirm').required = registration;
    fields.namedItem('confirm').disabled = !registration;
    fields.namedItem('password').minLength = registration ? 8 : 1;
    fields.namedItem('password').autocomplete = registration ? 'new-password' : 'current-password';
    if (registration) fields.namedItem('password').setAttribute('aria-describedby', 'auth-password-hint');
    else fields.namedItem('password').removeAttribute('aria-describedby');
    submit.textContent = busy ? t.wait : registration ? t.signup : t.login;
    switcher.textContent = registration ? t.back : t.register;
    dialog.querySelector('.auth-switch span').textContent = registration ? '' : t.invitation;
  }
  function loading(value) {
    busy = value;
    form.querySelector('fieldset').disabled = value;
    switcher.disabled = value;
    account.querySelector('button').disabled = value;
    account.querySelector('button').textContent = value ? t.wait : t.logout;
    // A locked button always shows why: the spinner comes from aria-busy (styles.css).
    for (const button of [submit, account.querySelector('button')]) { if (value) button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy'); }
    dialog.setAttribute('aria-busy', String(value));
    render();
  }
  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const config = window.IMAGINNE_AUTH;
        if (!config?.url || !config?.publishableKey) throw new Error('unavailable');
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
        const client = createClient(config.url, config.publishableKey);
        client.auth.onAuthStateChange((_event, next) => {
          authKnown = true;
          authFailed = false;
          // Registration must finish at the login form, even with email confirmation disabled.
          if (busy && mode === 'signup' && next) return;
          session = next;
          profile = null;
          profileFailed = false;
          const version = ++profileVersion;
          render();
          // Leave the auth callback before making another Supabase request.
          if (next) setTimeout(() => refreshProfile(client, next.user.id, version), 0);
        });
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        session = data.session;
        authKnown = true;
        authFailed = false;
        render();
        return client;
      })().catch(error => { clientPromise = null; authKnown = true; authFailed = true; render(); throw error; });
    }
    return clientPromise;
  }
  async function refreshProfile(client, userId, version = ++profileVersion) {
    try {
      const helpers = await helpersPromise;
      const next = await helpers.readProfile(client, userId);
      if (version !== profileVersion || session?.user?.id !== userId) return;
      profile = next;
      if (profileFailed) status();
      profileFailed = !next;
      if (profileFailed && dialog.open) status(t.profileError, true);
      render();
    } catch {
      if (version !== profileVersion) return;
      profile = null;
      profileFailed = true;
      if (dialog.open) status(t.profileError, true);
      render();
    }
  }
  function showError(error) {
    const codes = {
      invalid_credentials: t.credentials, email_not_confirmed: t.unconfirmed,
      weak_password: t.weak, over_request_rate_limit: t.rate, over_email_send_rate_limit: t.emailRate,
      user_already_exists: t.exists, email_exists: t.exists,
      signup_disabled: t.signupDisabled, email_address_invalid: t.invalidEmail,
      unexpected_failure: t.serverError,
    };
    status(codes[error.code] || (error.message === 'unavailable' || error instanceof TypeError ? t.unavailable : t.generic), true);
  }
  trigger.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    render();
    dialog.showModal();
    if (session) {
      const userId = session.user.id;
      if (profileFailed) status(t.profileError, true);
      getClient().then(client => refreshProfile(client, userId)).catch(showError);
    }
    (session ? account.querySelector('button') : fields.namedItem(mode === 'signup' ? 'name' : 'email')).focus();
  });
  dialog.querySelector('.auth-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dismissToast();
    fields.namedItem('password').value = '';
    fields.namedItem('confirm').value = '';
    if (!busy) { status(); mode = 'login'; }
    trigger.focus();
  });
  switcher.addEventListener('click', () => {
    dismissToast();
    mode = mode === 'login' ? 'signup' : 'login';
    status();
    fields.namedItem('password').value = '';
    fields.namedItem('confirm').value = '';
    fields.namedItem('confirm').setCustomValidity('');
    render();
    fields.namedItem(mode === 'signup' ? 'name' : 'email').focus();
  });
  form.addEventListener('input', () => {
    fields.namedItem('confirm').setCustomValidity('');
    fields.namedItem('name').setCustomValidity('');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const registration = mode === 'signup';
    const name = fields.namedItem('name').value.trim();
    const email = fields.namedItem('email').value.trim();
    const password = fields.namedItem('password').value;
    if (registration && !name) {
      fields.namedItem('name').setCustomValidity(t.nameRequired);
      form.reportValidity(); return;
    }
    if (registration && password !== fields.namedItem('confirm').value) {
      fields.namedItem('confirm').setCustomValidity(t.mismatch);
      form.reportValidity(); return;
    }
    dismissToast(); status(); loading(true);
    try {
      const client = await getClient();
      const { data, error } = registration
        ? await client.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: location.origin + location.pathname } })
        : await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (registration) {
        if (data.session) {
          const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
          if (signOutError) throw signOutError;
        }
        session = null;
        profile = null;
        ++profileVersion;
        form.reset();
        mode = 'login';
        fields.namedItem('email').value = email;
        render();
        showToast(data.session ? t.accountCreated : t.checkEmail);
      } else {
        session = data.session;
        form.reset();
        if (session) dialog.close();
      }
    } catch (error) { showError(error); }
    finally {
      loading(false);
      if (dialog.open && mode === 'login' && !session && !toast.hidden) fields.namedItem('password').focus();
    }
  });
  account.querySelector('button').addEventListener('click', async () => {
    if (busy) return;
    status(); loading(true);
    try {
      const client = await getClient();
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      session = null; mode = 'login'; form.reset(); render();
      fields.namedItem('email').focus();
    } catch (error) { showError(error); }
    finally { loading(false); }
  });
  render();
  // Never keep the predicted avatar waiting on a slow or silent SDK/profile request.
  setTimeout(() => document.documentElement.removeAttribute('data-auth'), 8000);
  if (window.IMAGINNE_AUTH?.url && window.IMAGINNE_AUTH?.publishableKey) {
    const start = () => getClient().catch(() => { /* Retried when the user submits. */ });
    // A returning visitor needs the SDK right away to restore the session. Everyone else only
    // needs it to sign in, so it waits until the page has loaded and the browser is idle.
    let stored = false;
    try { stored = Object.keys(localStorage).some(key => /^sb-.+-auth-token$/.test(key)); } catch { /* storage unavailable */ }
    if (stored) start();
    else {
      authKnown = true;
      render();
      const idle = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 4000 }) : setTimeout(start, 1500));
      if (document.readyState === 'complete') idle();
      else window.addEventListener('load', idle, { once: true });
    }
  }
})();
