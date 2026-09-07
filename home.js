/* ==========================================================================
   CursosMi - Home & Catalog View Module
   ========================================================================== */

import { API } from '../api.js';

let allCoursesCache = [];
let currentCategory = 'all';

export async function renderHome(containerElement, searchQuery = '') {
    currentCategory = 'all';
    containerElement.innerHTML = `
        <!-- Minimalist Hero Section -->
        <section class="hero-section" style="padding: 3.5rem 0 2.5rem 0; border-bottom: 1px solid var(--border-subtle); text-align: center;">
            <div class="container" style="max-width: 820px;">
                <div style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-medium); padding: 0.3rem 0.85rem; border-radius: var(--radius-full); font-size: 0.8rem; color: var(--text-secondary); font-weight: 500; margin-bottom: 1.25rem;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-emerald);"></span> Certificación Oficial con Código QR Único
                </div>
                <h1 style="font-family: var(--font-heading); font-size: 2.75rem; font-weight: 800; line-height: 1.18; margin-bottom: 0.85rem; letter-spacing: -0.02em; color: var(--text-primary);">
                    Aprende Profesiones Prácticas con <span style="color: var(--accent-gold);">Cursos de Calidad</span>
                </h1>
                <p style="color: var(--text-secondary); font-size: 1.05rem; margin-bottom: 1.75rem; max-width: 680px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                    Acceso de por vida a módulos completos, guías en PDF descargables, evaluaciones prácticas y acreditación directa con Mercado Pago.
                </p>

                <div style="display: flex; gap: 1.5rem; justify-content: center; align-items: center; font-size: 0.825rem; color: var(--text-muted); flex-wrap: wrap;">
                    <span><i class="fas fa-check" style="color: var(--accent-emerald); margin-right: 0.35rem;"></i> Acceso Vitalicio</span>
                    <span><i class="fas fa-bolt" style="color: #009ee3; margin-right: 0.35rem;"></i> Pago con Mercado Pago</span>
                    <span><i class="fas fa-award" style="color: var(--accent-gold); margin-right: 0.35rem;"></i> Diploma Acreditado</span>
                </div>
            </div>
        </section>

        <!-- Category Filters & Catalog Section -->
        <section class="container" style="padding-top: 2.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.75rem;" id="catalog-title">
                <div>
                    <h2 style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.2rem;">
                        Explorar Catálogo
                    </h2>
                    <p style="color: var(--text-muted); font-size: 0.85rem;">Encuentra el curso ideal para impulsar tu carrera.</p>
                </div>

                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <select id="sort-select" style="background: var(--bg-card); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.45rem 0.8rem; border-radius: var(--radius-md); font-size: 0.825rem; outline: none; cursor: pointer;">
                        <option value="pop">Más Populares</option>
                        <option value="price-asc">Precio: Menor a Mayor</option>
                        <option value="price-desc">Precio: Mayor a Menor</option>
                    </select>
                </div>
            </div>

            <!-- Categories Buttons Row (Pill Style) -->
            <div id="category-bar" style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.75rem; margin-bottom: 1.75rem;">
                <button class="category-btn active" data-cat="all">Todos</button>
                <button class="category-btn" data-cat="Barbería y Estética">Barbería & Estética</button>
                <button class="category-btn" data-cat="Programación y Tecnología">Programación & Tech</button>
                <button class="category-btn" data-cat="Marketing Digital">Marketing Digital</button>
            </div>

            <!-- Course Cards Grid -->
            <div id="courses-grid" class="grid-catalog">
                <div class="skeleton" style="height: 320px;"></div>
                <div class="skeleton" style="height: 320px;"></div>
                <div class="skeleton" style="height: 320px;"></div>
            </div>
        </section>
    `;

    // Inline CSS for Category Buttons
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        .category-btn {
            background-color: var(--bg-card);
            border: 1px solid var(--border-subtle);
            color: var(--text-secondary);
            padding: 0.4rem 0.9rem;
            border-radius: var(--radius-full);
            font-size: 0.825rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: var(--transition-fast);
        }
        .category-btn:hover {
            color: var(--text-primary);
            border-color: var(--border-medium);
        }
        .category-btn.active {
            background-color: var(--accent-gold);
            color: var(--text-inverse);
            border-color: var(--accent-gold);
        }
    `;
    document.head.appendChild(styleTag);

    // Load courses from API
    try {
        const data = await API.getCourses();
        allCoursesCache = Array.isArray(data) ? data : (data.courses || []);
        filterAndRenderGrid(searchQuery);
    } catch (err) {
        console.error('Error al cargar catálogo:', err);
    }

    // Attach Category Event Listeners
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-cat');
            filterAndRenderGrid(searchQuery);
        });
    });

    // Attach Sort Listener
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!Array.isArray(allCoursesCache)) return;
        if (val === 'price-asc') {
            allCoursesCache.sort((a, b) => a.price - b.price);
        } else if (val === 'price-desc') {
            allCoursesCache.sort((a, b) => b.price - a.price);
        } else {
            allCoursesCache.sort((a, b) => b.id - a.id);
        }
        filterAndRenderGrid(searchQuery);
    });
}

export function filterAndRenderGrid(query = '') {
    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    let coursesList = Array.isArray(allCoursesCache) ? allCoursesCache : (allCoursesCache?.courses || []);
    if (coursesList.length === 0) {
        coursesList = [{
            id: 1,
            title: 'Curso Profesional de Barbería & Fade Mastery (10 Módulos)',
            category: 'Barbería y Estética',
            skills: 'Corte con Navaja, Degradados Fade, Arreglo de Barba, Visagismo, Bioseguridad',
            price: 18500,
            avg_rating: 5,
            reviews_count: 1,
            banner_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'
        }];
    }
    let filtered = coursesList;

    // Apply category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(c => c.category === currentCategory);
    }

    // Apply text search query
    if (query.trim() !== '') {
        const q = query.toLowerCase();
        filtered = filtered.filter(c => 
            c.title.toLowerCase().includes(q) || 
            (c.skills && c.skills.toLowerCase().includes(q)) ||
            (c.category && c.category.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                <i class="fas fa-search" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="font-size: 1.25rem; font-weight: 700;">No se encontraron cursos</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Intenta buscar con otros términos o seleccionar otra categoría.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(course => `
        <div class="course-card fade-in">
            <div class="card-banner-wrapper">
                <img src="${course.banner_url || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'}" alt="${course.title}" class="card-banner-img" />
                <span class="card-category-badge"><i class="fas fa-tag"></i> ${course.category || 'Profesional'}</span>
            </div>
            
            <div class="card-body">
                <div class="card-rating-row">
                    <i class="fas fa-star"></i>
                    <span style="font-weight: 700; color: var(--text-primary);">${course.avg_rating || 5.0}</span>
                    <span class="rating-count">(${course.reviews_count || 1} reseñas)</span>
                    <span style="margin-left: auto; background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); font-size: 0.72rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: var(--radius-sm);">
                        <i class="fas fa-shield-alt"></i> 100% Online
                    </span>
                </div>

                <h3 class="card-title">${course.title}</h3>

                <div class="card-skills-tags">
                    ${(course.skills || 'Prácticas reales, Herramientas, Diploma').split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}
                </div>

                <div class="card-footer">
                    <div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">Inversión Única</div>
                        <div class="price-tag">$${Number(course.price).toLocaleString('es-AR')} ARS</div>
                    </div>
                    <a href="#/curso/${course.id}" class="btn btn-primary btn-sm">
                        Ver Temario <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}
