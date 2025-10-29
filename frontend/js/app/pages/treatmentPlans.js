import { Elements } from '../../core/elements.js';
import ApiService from '../../services/api.js';
import { showLoading, hideLoading, showError, showSuccess } from '../../utils/ui.js';

function getCurrentDay(plan) {
    const firstIncomplete = (plan.days || []).find(d => !d.completed);
    return firstIncomplete ? firstIncomplete.day : (plan.days?.length || 7);
}

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
    const progressPct = Math.round((currentDay - 1) / (plan.days.length || 7) * 100);

    const lastEval = Array.isArray(plan.evaluations) && plan.evaluations.length > 0 ? plan.evaluations[plan.evaluations.length - 1] : null;
    Elements.treatmentPlanContent.innerHTML = `
        <div class="modal-layout">
            <div class="modal-analysis-grid">
                <div class="result-item"><div class="result-label">Disease</div><div class="result-value">${plan.disease_name}</div></div>
                <div class="result-item"><div class="result-label">Cycle</div><div class="result-value">${plan.cycle}</div></div>
                <div class="result-item"><div class="result-label">Status</div><div class="result-value">${statusMap[plan.status] || plan.status}</div></div>
                <div class="result-item">
                    <div class="result-label">Progress</div>
                    <div class="confidence-bar"><div class="confidence-fill" style="width:${progressPct}%;"></div></div>
                    <div class="confidence-text">Day ${currentDay} of ${plan.days.length || 7}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Reminders</div>
                    <button id="reminderToggleBtn" class="btn ${plan.reminders_enabled ? 'btn-primary' : ''}">${plan.reminders_enabled ? 'Reminders On 🔔' : 'Reminders Off 🔕'}</button>
                </div>
                ${lastEval ? `
                <div class=\"result-item\">
                    <div class=\"result-label\">Latest Evaluation</div>
                    <div class=\"result-value\">Outcome: <strong>${lastEval.outcome}</strong></div>
                    <div style=\"margin-top:6px; color:#555; font-size:0.9em;\">
                        Before: ${lastEval.before.disease} (${lastEval.before.severity}) → After: ${lastEval.after.disease} (${lastEval.after.severity})
                    </div>
                </div>` : ''}
                <div class="result-item"><div class="result-label">Before Photo</div><img src="${plan.before_photo_url}" style="max-width:100%; border-radius:8px;"/></div>
                ${plan.after_photo_url ? `<div class="result-item"><div class="result-label">After Photo</div><img src="${plan.after_photo_url}" style="max-width:100%; border-radius:8px;"/></div>` : `<div class="result-item"><div class="result-label">After Photo</div><div style="border:2px dashed var(--border); border-radius:8px; padding:16px; color:var(--muted);">Upload your Day 7 rescan to compare</div></div>`}
            </div>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">${daysHtml}</div>
            <div style="display:flex; gap:12px; margin-top:16px;">
                ${plan.status === 'active' ? `<label class="btn btn-secondary" style="cursor:pointer;">
                    <input id="rescanFileInput" type="file" accept="image/*" style="display:none;">
                    Upload Day 7 Rescan & Evaluate
                </label>` : ''}
                
            </div>
        </div>
    `;

    // Task toggles
    Elements.treatmentPlanContent.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.addEventListener('change', async (e) => {
            try {
                await ApiService.toggleTreatmentTask(plan.plan_id, parseInt(e.target.dataset.day, 10), e.target.dataset.taskId);
                showSuccess('Updated');
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
                showSuccess('Notes saved');
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
                const evalResp = await ApiService.evaluateTreatmentPlan(plan.plan_id, afterUrl);
                hideLoading();
                if (evalResp?.evaluation?.outcome) {
                    const outcome = evalResp.evaluation.outcome;
                    const msg = outcome === 'improved' ? 'Great news! The condition improved.' : outcome === 'worsened' ? 'Heads up: The condition worsened. Plan updated.' : 'No significant change detected.';
                    showSuccess(msg);
                } else {
                    showSuccess('Rescan uploaded and evaluated');
                }
                await openTreatmentPlan(plan.plan_id); // reload with latest status/evaluations
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
        const userPlans = await ApiService.getTreatmentPlans();
        hideLoading();
        const plan = (userPlans.data || []).find(p => p.plan_id === planId);
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


