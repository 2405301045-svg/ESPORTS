/* ============================================================
   NEXUS ARENA — Esports Gaming Hub
   JavaScript: Physics Engine, Particles, Scroll Animations
   ============================================================ */

// ==========================================
// 1. PARTICLE BACKGROUND ENGINE
// ==========================================
const ParticleSystem = (() => {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouse = { x: null, y: null };
  let animId;

  // Particle colors matching our neon palette
  const COLORS = [
    'rgba(0, 212, 255,',   // neon-blue
    'rgba(255, 45, 123,',  // neon-pink
    'rgba(168, 85, 247,',  // neon-purple
    'rgba(34, 211, 238,',  // cyan
    'rgba(124, 58, 237,',  // violet
  ];

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = (Math.random() - 0.5) * 0.4;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.opacity = Math.random() * 0.5 + 0.1;
      this.opacitySpeed = (Math.random() - 0.5) * 0.005;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.opacity += this.opacitySpeed;

      // Soft opacity oscillation
      if (this.opacity <= 0.05 || this.opacity >= 0.6) {
        this.opacitySpeed *= -1;
      }

      // Mouse interaction — gentle repulsion
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          this.speedX += (dx / dist) * force * 0.02;
          this.speedY += (dy / dist) * force * 0.02;
        }
      }

      // Damping
      this.speedX *= 0.999;
      this.speedY *= 0.999;

      // Wrap around edges
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.opacity + ')';
      ctx.fill();
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function connectParticles() {
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const opacity = (1 - dist / 120) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    connectParticles();
    animId = requestAnimationFrame(animate);
  }

  function init() {
    resize();
    // Adjust particle count based on screen size
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 120);
    particles = Array.from({ length: count }, () => new Particle());
    animate();
  }

  // Event listeners
  window.addEventListener('resize', () => {
    resize();
    cancelAnimationFrame(animId);
    const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 120);
    particles = Array.from({ length: count }, () => new Particle());
    animate();
  });

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  return { init, getMouse: () => mouse };
})();


// ==========================================
// 2. ANTI-GRAVITY PHYSICS ENGINE
// ==========================================
const AntiGravityEngine = (() => {
  let active = false;
  let bodies = [];
  let animId;
  let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  // Physics constants
  const GRAVITY = 0.35;
  const BOUNCE_DAMPING = 0.55;
  const FRICTION = 0.985;
  const MOUSE_FORCE = 0.08;
  const MOUSE_RADIUS = 250;

  // Represents a physics body attached to a DOM element
  class PhysicsBody {
    constructor(el) {
      this.el = el;
      this.mass = parseFloat(el.dataset.mass) || 1;
      const rect = el.getBoundingClientRect();
      this.x = rect.left;
      this.y = rect.top;
      this.width = rect.width;
      this.height = rect.height;
      this.vx = (Math.random() - 0.5) * 6;
      this.vy = (Math.random() - 0.5) * 4 - 3;
      this.rotation = 0;
      this.angularVel = (Math.random() - 0.5) * 3;
      this.isDragging = false;
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;

      // Store original styles for restoring
      this.originalStyles = {
        position: el.style.position,
        top: el.style.top,
        left: el.style.left,
        width: el.style.width,
        height: el.style.height,
        transform: el.style.transform,
        zIndex: el.style.zIndex,
        transition: el.style.transition,
      };
    }

    activate() {
      const rect = this.el.getBoundingClientRect();
      this.x = rect.left;
      this.y = rect.top;
      this.width = rect.width;
      this.height = rect.height;

      this.el.classList.add('physics-active');
      this.el.style.width = this.width + 'px';
      this.el.style.height = this.height + 'px';
      this.el.style.left = this.x + 'px';
      this.el.style.top = this.y + 'px';

      // Drag events
      this.el.addEventListener('mousedown', this._onMouseDown);
      this.el.addEventListener('touchstart', this._onTouchStart, { passive: false });
    }

    deactivate() {
      this.el.classList.remove('physics-active');
      // Restore original inline styles
      Object.entries(this.originalStyles).forEach(([key, val]) => {
        this.el.style[key] = val || '';
      });
      this.el.style.transform = '';
      this.el.removeEventListener('mousedown', this._onMouseDown);
      this.el.removeEventListener('touchstart', this._onTouchStart);
    }

    // --- Drag handlers ---
    _onMouseDown = (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.dragOffsetX = e.clientX - this.x;
      this.dragOffsetY = e.clientY - this.y;
    };

    _onTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.isDragging = true;
      this.dragOffsetX = touch.clientX - this.x;
      this.dragOffsetY = touch.clientY - this.y;
    };

    update() {
      if (this.isDragging) return;

      const W = window.innerWidth;
      const H = window.innerHeight;

      // Apply gravity
      this.vy += GRAVITY * this.mass * 0.5;

      // Mouse influence — gentle tilt
      const dx = mousePos.x - (this.x + this.width / 2);
      const dy = mousePos.y - (this.y + this.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = ((MOUSE_RADIUS - dist) / MOUSE_RADIUS) * MOUSE_FORCE;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }

      // Apply friction
      this.vx *= FRICTION;
      this.vy *= FRICTION;
      this.angularVel *= 0.98;

      // Move
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.angularVel;

      // --- Boundary collisions with bounce ---
      // Bottom
      if (this.y + this.height > H) {
        this.y = H - this.height;
        this.vy *= -BOUNCE_DAMPING;
        this.angularVel += this.vx * 0.05;
        // Small random horizontal kick on bounce
        this.vx += (Math.random() - 0.5) * 1.5;
      }
      // Top
      if (this.y < 0) {
        this.y = 0;
        this.vy *= -BOUNCE_DAMPING;
      }
      // Right
      if (this.x + this.width > W) {
        this.x = W - this.width;
        this.vx *= -BOUNCE_DAMPING;
        this.angularVel -= this.vy * 0.03;
      }
      // Left
      if (this.x < 0) {
        this.x = 0;
        this.vx *= -BOUNCE_DAMPING;
        this.angularVel += this.vy * 0.03;
      }
    }

    render() {
      this.el.style.left = this.x + 'px';
      this.el.style.top = this.y + 'px';
      this.el.style.transform = `rotate(${this.rotation}deg)`;
    }
  }

  // --- Simple body-to-body collision ---
  function resolveCollisions() {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        if (a.isDragging || b.isDragging) continue;

        // AABB overlap check
        const ax = a.x, ay = a.y, aw = a.width, ah = a.height;
        const bx = b.x, by = b.y, bw = b.width, bh = b.height;

        if (ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by) {
          // Overlap — push apart
          const overlapX = Math.min(ax + aw - bx, bx + bw - ax);
          const overlapY = Math.min(ay + ah - by, by + bh - ay);

          if (overlapX < overlapY) {
            const sign = (ax + aw / 2) < (bx + bw / 2) ? -1 : 1;
            a.x += sign * overlapX * 0.5;
            b.x -= sign * overlapX * 0.5;
            // Swap velocities with damping
            const tempVx = a.vx;
            a.vx = b.vx * 0.7;
            b.vx = tempVx * 0.7;
          } else {
            const sign = (ay + ah / 2) < (by + bh / 2) ? -1 : 1;
            a.y += sign * overlapY * 0.5;
            b.y -= sign * overlapY * 0.5;
            const tempVy = a.vy;
            a.vy = b.vy * 0.7;
            b.vy = tempVy * 0.7;
          }
        }
      }
    }
  }

  // --- Global drag handlers ---
  function onMouseMove(e) {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    bodies.forEach(b => {
      if (b.isDragging) {
        b.vx = (e.clientX - b.dragOffsetX - b.x) * 0.3;
        b.vy = (e.clientY - b.dragOffsetY - b.y) * 0.3;
        b.x = e.clientX - b.dragOffsetX;
        b.y = e.clientY - b.dragOffsetY;
      }
    });
  }

  function onMouseUp() {
    bodies.forEach(b => { b.isDragging = false; });
  }

  function onTouchMove(e) {
    const touch = e.touches[0];
    mousePos.x = touch.clientX;
    mousePos.y = touch.clientY;
    bodies.forEach(b => {
      if (b.isDragging) {
        b.vx = (touch.clientX - b.dragOffsetX - b.x) * 0.3;
        b.vy = (touch.clientY - b.dragOffsetY - b.y) * 0.3;
        b.x = touch.clientX - b.dragOffsetX;
        b.y = touch.clientY - b.dragOffsetY;
      }
    });
  }

  function onTouchEnd() {
    bodies.forEach(b => { b.isDragging = false; });
  }

  // --- Animation loop ---
  function loop() {
    bodies.forEach(b => b.update());
    resolveCollisions();
    bodies.forEach(b => b.render());
    animId = requestAnimationFrame(loop);
  }

  // --- Public API ---
  function activate() {
    if (active) return;
    active = true;
    document.body.style.overflow = 'hidden';

    // Collect all antigravity elements
    const elements = document.querySelectorAll('.antigravity-element');
    bodies = Array.from(elements).map(el => new PhysicsBody(el));

    // Stagger activation for dramatic effect
    bodies.forEach((b, i) => {
      setTimeout(() => b.activate(), i * 50);
    });

    // Global event listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // Start physics loop
    setTimeout(() => { animId = requestAnimationFrame(loop); }, bodies.length * 50 + 100);
  }

  function deactivate() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(animId);
    document.body.style.overflow = '';

    bodies.forEach(b => b.deactivate());
    bodies = [];

    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  }

  function toggle() {
    active ? deactivate() : activate();
    return active;
  }

  function isActive() { return active; }

  return { activate, deactivate, toggle, isActive };
})();


// ==========================================
// 3. SCROLL REVEAL ANIMATIONS
// ==========================================
const ScrollReveal = (() => {
  let observer;

  function init() {
    const elements = document.querySelectorAll('.scroll-reveal');
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay) || 0;
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    elements.forEach(el => observer.observe(el));
  }

  return { init };
})();


// ==========================================
// 4. NAVBAR SCROLL EFFECT
// ==========================================
const NavbarEffect = (() => {
  function init() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }
  return { init };
})();


// ==========================================
// 5. STAT COUNTER ANIMATION
// ==========================================
const StatCounter = (() => {
  function animateValue(el, start, end, duration) {
    const startTime = performance.now();
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * eased);
      el.textContent = current.toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function init() {
    const counters = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.dataset.count);
          animateValue(entry.target, 0, target, 2000);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }

  return { init };
})();


// ==========================================
// 6. MOBILE MENU
// ==========================================
const MobileMenu = (() => {
  function init() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', () => {
      menu.classList.toggle('active');
      btn.classList.toggle('active');
    });

    // Close menu on link click
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('active');
        btn.classList.remove('active');
      });
    });
  }
  return { init };
})();


// ==========================================
// 7. TILT/PARALLAX ON CARDS (mouse-based)
// ==========================================
const CardTilt = (() => {
  function init() {
    const cards = document.querySelectorAll('.game-card, .tournament-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        if (AntiGravityEngine.isActive()) return; // disable during physics
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        if (AntiGravityEngine.isActive()) return;
        card.style.transform = '';
      });
    });
  }
  return { init };
})();


// ==========================================
// 8. BUTTON RIPPLE EFFECT
// ==========================================
const ButtonRipple = (() => {
  function init() {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          background: radial-gradient(circle, rgba(255,255,255,0.3), transparent);
          border-radius: 50%;
          transform: scale(0);
          animation: rippleAnim 0.6s ease-out forwards;
          pointer-events: none;
        `;
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Inject the ripple keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rippleAnim {
        to { transform: scale(4); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  return { init };
})();


// ==========================================
// 9. SMOOTH SCROLL FOR ANCHOR LINKS
// ==========================================
const SmoothScroll = (() => {
  function init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          // Deactivate antigravity if active
          if (AntiGravityEngine.isActive()) AntiGravityEngine.deactivate();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
  return { init };
})();


// ==========================================
// 10. ENERGY BEAM CURSOR TRAIL
// ==========================================
const CursorTrail = (() => {
  const trails = [];
  const MAX_TRAILS = 12;

  function init() {
    for (let i = 0; i < MAX_TRAILS; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        position: fixed;
        width: ${6 - i * 0.4}px;
        height: ${6 - i * 0.4}px;
        background: rgba(0, 212, 255, ${0.5 - i * 0.04});
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999;
        transition: transform 0.1s ease;
        box-shadow: 0 0 ${6 - i * 0.3}px rgba(0, 212, 255, ${0.3 - i * 0.02});
      `;
      document.body.appendChild(dot);
      trails.push({ el: dot, x: 0, y: 0 });
    }

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animate() {
      trails.forEach((trail, i) => {
        const prev = i === 0 ? { x: mouseX, y: mouseY } : trails[i - 1];
        trail.x += (prev.x - trail.x) * (0.35 - i * 0.02);
        trail.y += (prev.y - trail.y) * (0.35 - i * 0.02);
        trail.el.style.left = trail.x + 'px';
        trail.el.style.top = trail.y + 'px';
      });
      requestAnimationFrame(animate);
    }
    animate();
  }
  return { init };
})();


// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all systems
  ParticleSystem.init();
  ScrollReveal.init();
  NavbarEffect.init();
  StatCounter.init();
  MobileMenu.init();
  CardTilt.init();
  ButtonRipple.init();
  SmoothScroll.init();
  CursorTrail.init();

  // Anti-gravity toggle button
  const toggleBtn = document.getElementById('antigravity-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isActive = AntiGravityEngine.toggle();
      toggleBtn.textContent = isActive ? '🔄 Restore' : '🌀 Anti-Gravity';
      toggleBtn.classList.toggle('btn-primary', isActive);
      toggleBtn.classList.toggle('btn-outline', !isActive);
    });
  }

  console.log('%c⚡ NEXUS ARENA loaded — Click "Anti-Gravity" to unleash chaos!', 'color: #00d4ff; font-size: 14px; font-weight: bold;');
});
