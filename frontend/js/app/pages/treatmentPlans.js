import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showError, showSuccess } from '../../utils/ui.js';

function getCurrentDay(plan) {
    const firstIncomplete = (plan.days || []).find(d => !d.completed);
    return firstIncomplete ? firstIncomplete.day : (plan.days?.length || 7);
}

const toTitleCase = (value) => {
    if (!value) return '';
    return value
        .toString()
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatSeverity = (severity) => {
    if (!severity) return 'Unknown';
    return severity.charAt(0).toUpperCase() + severity.slice(1);
};

const formatPercent = (value) => {
    if (typeof value !== 'number') return '—';
    return `${value.toFixed(1)}%`;
};

const renderInfoRow = (label, value) => {
    return `
        <div style="display:flex; justify-content:space-between; gap:12px; font-size:0.85rem;">
            <span style="color:var(--muted); text-transform:uppercase; letter-spacing:0.08em;">${label}</span>
            <span style="font-weight:600; text-align:right;">${value}</span>
        </div>
    `;
};

const renderListSection = (title, items) => {
    if (!Array.isArray(items) || items.length === 0) return '';
    return `
        <div style="margin-top:10px;">
            <div style="color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">${title}</div>
            <div class="recommendation-list" style="margin-top:6px;">
                ${items.map(item => `<div class="recommendation-item">• ${item}</div>`).join('')}
            </div>
        </div>
    `;
};

const renderPredictionChips = (predictions) => {
    if (!predictions || typeof predictions !== 'object') return '';
    const entries = Object.entries(predictions).filter(([, value]) => typeof value === 'number');
    if (entries.length === 0) return '';
    const topEntries = entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
    const chips = topEntries.map(([key, value]) => `<span style="background:rgba(56,142,60,0.1); color:#2e7d32; border-radius:999px; padding:4px 10px; font-size:12px; font-weight:600;">${toTitleCase(key)} ${value.toFixed(1)}%</span>`).join('');
    return `
        <div style="margin-top:10px;">
            <div style="color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Top Probabilities</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">${chips}</div>
        </div>
    `;
};

const renderEvaluationDetailCard = (title, detail = {}) => {
    if (!detail || Object.keys(detail).length === 0) {
        return `
            <div class="card" style="padding:12px;">
                <div class="result-label">${title}</div>
                <div style="margin-top:6px; color:var(--muted); font-size:0.85rem;">No data available</div>
            </div>
        `;
    }

    const rows = [
        renderInfoRow('Disease', detail.disease || 'Unknown'),
        renderInfoRow('Severity', formatSeverity(detail.severity)),
        renderInfoRow('Status', detail.status ? toTitleCase(detail.status) : '—'),
        renderInfoRow('Confidence', formatPercent(detail.confidence)),
        detail.source ? renderInfoRow('Source', toTitleCase(detail.source)) : ''
    ].filter(Boolean).join('');

    const descriptionBlock = detail.description ? `<div style="margin-top:10px; font-size:0.9em; color:var(--muted); line-height:1.5;">${detail.description}</div>` : '';

    return `
        <div class="card" style="padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div class="result-label">${title}</div>
            <div style="display:grid; gap:6px;">${rows}</div>
            ${descriptionBlock}
            ${renderListSection('Treatments', detail.treatments)}
            ${renderListSection('Prevention', detail.prevention)}
            ${renderListSection('Causes', detail.causes)}
            ${renderPredictionChips(detail.allPredictions)}
        </div>
    `;
};

const renderLatestEvaluation = (evaluation) => {
    if (!evaluation) return '';
    const beforeCard = renderEvaluationDetailCard('Before', evaluation.before);
    const afterCard = renderEvaluationDetailCard('After', evaluation.after);
    const beforeSeverity = evaluation.before?.severity ? formatSeverity(evaluation.before.severity) : 'Unknown';
    const afterSeverity = evaluation.after?.severity ? formatSeverity(evaluation.after.severity) : 'Unknown';
    const severityShift = evaluation.scores ? `${beforeSeverity} → ${afterSeverity}` : '';
    return `
        <div class="result-item" style="grid-column:1 / -1;">
            <div class="result-label">Latest Evaluation</div>
            <div class="result-value">Outcome: <strong>${toTitleCase(evaluation.outcome)}</strong></div>
            ${severityShift ? `<div class="confidence-text" style="margin-top:6px;">Severity: ${severityShift}</div>` : ''}
            ${evaluation.scores ? `<div class="confidence-text" style="margin-top:4px;">Score: ${evaluation.scores.before} → ${evaluation.scores.after}</div>` : ''}
            <div style="margin-top:12px; display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));">
                ${beforeCard}
                ${afterCard}
            </div>
        </div>
    `;
};

function renderPlan(plan) {
    if (!Elements.treatmentPlanContent) return;
    const daysHtml = plan.days.map(d => {
        const tasks = d.tasks.map(t => `
            <label style="display:flex; gap:8px; align-items:center; margin:6px 0;">
                <input type="checkbox" data-task-id="${t.id}" data-day="${d.day}" ${t.completed ? 'checked' : ''}>
                <span>${t.text}${t.timing ? ` <span style=\"color:var(--muted); font-size:12px;\">(${t.timing})</span>` : ''}</span>
            </label>
        `).join('');

        const collapsed = d.collapsed && d.completed;
        return `
            <div class="card" style="padding:12px; ${d.completed ? 'opacity:0.95' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" class="day-header" data-day="${d.day}">
                    <h3 style="margin:0;">Day ${d.day}</h3>
                    <div style="display:flex; gap:8px; align-items:center;">
                        ${d.completed ? '<span class="status-badge status-healthy">Done</span>' : ''}
                        <span class="toggle-icon">${collapsed ? '▸' : '▾'}</span>
                    </div>
                </div>
                <div class="day-body" style="margin-top:8px; ${collapsed ? 'display:none;' : ''}">
                    <div>${tasks}</div>
                    <div style="margin-top:10px;">
                        <label class="result-label" style="display:block; margin-bottom:6px;">Notes</label>
                        <textarea data-notes-day="${d.day}" placeholder="Add observations (optional)" style="width:100%; min-height:72px; resize:vertical; padding:8px;"></textarea>
                        <div style="margin-top:8px;"><button class="btn btn-secondary" data-save-notes-day="${d.day}">Save Notes</button></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const statusMap = {
        active: 'Active',
        completed_success: 'Completed',
        leaf_removal_recommended: 'Leaf Removal Recommended'
    };

    const currentDay = getCurrentDay(plan);
    const totalDays = Array.isArray(plan.days) && plan.days.length ? plan.days.length : 7;
    const completedDays = Array.isArray(plan.days) ? plan.days.filter(d => d.completed).length : 0;
    const progressPct = totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100);

    const lastEval = Array.isArray(plan.evaluations) && plan.evaluations.length > 0 ? plan.evaluations[plan.evaluations.length - 1] : null;
    const evaluationSection = renderLatestEvaluation(lastEval);
    Elements.treatmentPlanContent.innerHTML = `
        <div class="modal-layout">
            <div class="modal-analysis-grid">
                <div class="result-item"><div class="result-label">Disease</div><div class="result-value">${plan.disease_name}</div></div>
                <div class="result-item"><div class="result-label">Cycle</div><div class="result-value">${plan.cycle}</div></div>
                <div class="result-item"><div class="result-label">Status</div><div class="result-value">${statusMap[plan.status] || plan.status}</div></div>
                <div class="result-item">
                    <div class="result-label">Progress</div>
                    <div class="confidence-bar"><div class="confidence-fill" style="width:${progressPct}%;"></div></div>
                    <div class="confidence-text">Day ${currentDay} of ${totalDays}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Reminders</div>
                    <button id="reminderToggleBtn" class="btn ${plan.reminders_enabled ? 'btn-primary' : ''}">${plan.reminders_enabled ? 'Reminders On 🔔' : 'Reminders Off 🔕'}</button>
                </div>
                ${evaluationSection}
                <div class="result-item"><div class="result-label">Before Photo</div><img src="${plan.before_photo_url}" style="max-width:100%; border-radius:8px;"/></div>
                ${plan.after_photo_url ? `<div class="result-item"><div class="result-label">After Photo</div><img src="${plan.after_photo_url}" style="max-width:100%; border-radius:8px;"/></div>` : `<div class="result-item"><div class="result-label">After Photo</div><div style="border:2px dashed var(--border); border-radius:8px; padding:16px; color:var(--muted);">Upload your Day 7 rescan to compare</div></div>`}
            </div>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">${daysHtml}</div>
            <div style="display:flex; gap:12px; margin-top:16px;">
                ${plan.status === 'active' && plan.cycle === 1 ? `
                    ${currentDay >= totalDays ? `
                        <label class="btn btn-secondary" style="cursor:pointer;">
                            <input id="rescanFileInput" type="file" accept="image/*" style="display:none;">
                            Upload Day ${totalDays} Rescan & Evaluate
                        </label>
                    ` : `
                        <button class="btn btn-secondary" disabled title="Available after completing Day ${totalDays}">Upload Day ${totalDays} Rescan & Evaluate</button>
                    `}
                ` : plan.status === 'active' && plan.cycle === 2 ? `
                    <label class="btn btn-secondary" style="cursor:pointer;">
                        <input id="rescanFileInput" type="file" accept="image/*" style="display:none;">
                        Upload Day ${totalDays} Rescan & Evaluate
                    </label>
                ` : ''}
            </div>
        </div>
    `;

    // Show popup for leaf removal recommendation
    if (plan.status === 'leaf_removal_recommended') {
        const existingPopup = document.querySelector('.leaf-removal-popup');
        if (!existingPopup) {
            const popup = document.createElement('div');
            popup.className = 'leaf-removal-popup';
            popup.innerHTML = `
                <div class="popup-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;">
                    <div class="popup-content" style="background:white; padding:24px; border-radius:8px; max-width:400px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        <h3 style="margin:0 0 16px 0; color:#d32f2f;">Leaf Removal Recommended</h3>
                        <p style="margin:0 0 20px 0; line-height:1.5;">To prevent the disease from spreading to other parts of your plant, we strongly recommend cutting off the affected leaf immediately. This is the best way to protect your plant's health.</p>
                        <button class="btn btn-primary leaf-removal-ack-btn" style="padding:10px 20px;">I Understand</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);

            // Add event listener to the acknowledge button
            const ackBtn = popup.querySelector('.leaf-removal-ack-btn');
            if (ackBtn) {
                ackBtn.addEventListener('click', () => {
                    popup.remove();
                });
            }
        }
    }

    // Task toggles
    Elements.treatmentPlanContent.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.addEventListener('change', async (e) => {
            try {
                await ApiService.toggleTreatmentTask(plan.plan_id, parseInt(e.target.dataset.day, 10), e.target.dataset.taskId);
                // Re-fetch plan and re-render to update progress/collapsed state
                const refreshed = await ApiService.getTreatmentPlan(plan.plan_id);
                renderPlan(refreshed.data);
            } catch (err) {
                showError(err.message);
                e.target.checked = !e.target.checked;
            }
        });
    });

    // Expand/collapse completed days
    Elements.treatmentPlanContent.querySelectorAll('.day-header').forEach(h => {
        h.addEventListener('click', () => {
            const day = parseInt(h.getAttribute('data-day'), 10);
            const body = h.parentElement.querySelector('.day-body');
            if (!body) return;
            const isHidden = body.style.display === 'none';
            body.style.display = isHidden ? '' : 'none';
            const icon = h.querySelector('.toggle-icon');
            if (icon) icon.textContent = isHidden ? '▾' : '▸';
        });
    });

    // Load existing notes into textareas
    Elements.treatmentPlanContent.querySelectorAll('textarea[data-notes-day]').forEach(area => {
        const day = parseInt(area.getAttribute('data-notes-day'), 10);
        const d = plan.days.find(x => x.day === day);
        if (d && d.notes) area.value = d.notes;
    });

    // Save notes
    Elements.treatmentPlanContent.querySelectorAll('button[data-save-notes-day]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const day = parseInt(btn.getAttribute('data-save-notes-day'), 10);
            const area = Elements.treatmentPlanContent.querySelector(`textarea[data-notes-day="${day}"]`);
            try {
                await ApiService.saveTreatmentNotes(plan.plan_id, day, (area?.value || ''));
                const refreshed = await ApiService.getTreatmentPlan(plan.plan_id);
                renderPlan(refreshed.data);
            } catch (err) {
                showError(err.message);
            }
        });
    });

    // Upload rescan
    const fileInput = document.getElementById('rescanFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                showLoading('Uploading rescan image...');
                const upload = await ApiService.uploadImage(file, 'analysis');
                const afterUrl = upload.data.path || upload.data.cloudinaryUrl;
                await ApiService.setAfterPhoto(plan.plan_id, afterUrl);
                let evalResp;
                try {
                    evalResp = await ApiService.evaluateTreatmentPlan(plan.plan_id, afterUrl);
                } catch (errEval) {
                    // If backend hasn't persisted after photo yet, retry once after short delay
                    if (/After photo not set/i.test(errEval.message)) {
                        await new Promise(r => setTimeout(r, 600));
                        evalResp = await ApiService.evaluateTreatmentPlan(plan.plan_id, afterUrl);
                    } else {
                        throw errEval;
                    }
                }
                hideLoading();
                if (evalResp?.evaluation?.outcome) {
                    const outcome = evalResp.evaluation.outcome;
                    const msg = outcome === 'improved' ? 'Great news! The condition improved.' : outcome === 'worsened' ? 'Heads up: The condition worsened. Plan updated.' : 'No significant change detected.';
                    showSuccess(msg);
                } else {
                    showSuccess('Rescan uploaded and evaluated');
                }
                const refreshed = await ApiService.getTreatmentPlan(plan.plan_id);
                renderPlan(refreshed.data);
            } catch (err) {
                hideLoading();
                showError(err.message);
            }
        });
    }


    const reminderBtn = document.getElementById('reminderToggleBtn');
    if (reminderBtn) {
        reminderBtn.addEventListener('click', async () => {
            try {
                const next = !plan.reminders_enabled;
                await ApiService.setReminders(plan.plan_id, next);
                showSuccess(next ? 'Reminders enabled' : 'Reminders disabled');
                await openTreatmentPlan(plan.plan_id);
            } catch (err) {
                showError(err.message);
            }
        });
    }
}

export async function openTreatmentPlan(planId) {
    try {
        showLoading('Loading treatment plan...');
        const resp = await ApiService.getTreatmentPlan(planId);
        hideLoading();
        const plan = resp.data;
        if (!plan) return showError('Plan not found');
        if (Elements.treatmentPlanTitle) Elements.treatmentPlanTitle.textContent = `Treatment Plan - ${plan.disease_name}`;
        Elements.treatmentPlanModal.classList.add('show');
        renderPlan(plan);
    } catch (err) {
        hideLoading();
        showError(err.message);
    }
}

export function initTreatmentPlansUI() {
    if (!Elements.treatmentPlanModal) return;
    // Open modal via custom event from analyze page
    window.addEventListener('openTreatmentPlan', (e) => {
        if (!e.detail?.planId) return;
        openTreatmentPlan(e.detail.planId);
    });
    if (Elements.treatmentPlanCloseBtn) {
        Elements.treatmentPlanCloseBtn.addEventListener('click', () => {
            Elements.treatmentPlanModal.classList.remove('show');
        });
    }
}


