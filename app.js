document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    // Authentication Logic
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (isAuthenticated) {
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'block';
    } else {
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        if (user === 'Gopi' && pass === 'Gs175175') {
            sessionStorage.setItem('isAuthenticated', 'true');
            loginOverlay.style.display = 'none';
            appContainer.style.display = 'block';
        } else {
            loginError.style.display = 'block';
        }
    });

    const memberForm = document.getElementById('member-form');
    const memberList = document.getElementById('member-list');
    const emptyState = document.getElementById('empty-state');
    const totalMembersEl = document.getElementById('total-members');
    const totalLoansEl = document.getElementById('total-loans');
    const memberTable = document.getElementById('member-table');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const exportBtn = document.getElementById('export-btn');

    let statusChartInstance = null;
    let purposeChartInstance = null;

    // State
    let members = JSON.parse(localStorage.getItem('bankMembers')) || [];

    // Chart Defaults
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    // Initial render
    renderMembers();

    // Handle form submit
    memberForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('member-name');
        const contactInput = document.getElementById('contact-number');
        const loanInput = document.getElementById('loan-amount');
        const termInput = document.getElementById('loan-term');
        const interestInput = document.getElementById('interest-rate');
        const purposeInput = document.getElementById('loan-purpose');

        const loanAmount = parseFloat(loanInput.value);
        const termMonths = parseInt(termInput.value, 10);
        const interestRate = parseFloat(interestInput.value);

        // EMI Calculation
        // P * r * (1+r)^n / ((1+r)^n - 1)
        let monthlyPayment = 0;
        if (interestRate > 0) {
            const r = (interestRate / 100) / 12;
            monthlyPayment = loanAmount * r * Math.pow(1 + r, termMonths) / (Math.pow(1 + r, termMonths) - 1);
        } else {
            monthlyPayment = loanAmount / termMonths;
        }

        const newMember = {
            id: Date.now().toString(),
            name: nameInput.value.trim(),
            contact: contactInput.value.trim(),
            loanAmount: loanAmount,
            termMonths: termMonths,
            interestRate: interestRate,
            purpose: purposeInput.value,
            monthlyPayment: monthlyPayment,
            status: 'Pending',
            dateAdded: new Date().toISOString()
        };

        members.push(newMember);
        saveData();
        renderMembers();
        
        // Reset form
        memberForm.reset();
    });

    // Delete member
    window.deleteMember = (id) => {
        members = members.filter(member => member.id !== id);
        saveData();
        renderMembers();
    };

    // Update member status
    window.updateStatus = (id, newStatus) => {
        const member = members.find(m => m.id === id);
        if (member) {
            const oldStatus = member.status;
            member.status = newStatus;
            saveData();
            renderMembers();

            if (newStatus === 'Approved' && oldStatus !== 'Approved') {
                sendSMS(member);
            }
        }
    };

    async function sendSMS(member) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const msg = `Hello ${member.name}, your loan of ${formatCurrency(member.loanAmount)} has been accepted. You will be paying ${formatCurrency(member.monthlyPayment)} every month. - TIDC Cooperative Society`;
        
        try {
            const response = await fetch('/api/send-sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: member.contact,
                    message: msg
                })
            });

            const result = await response.json();

            const toast = document.createElement('div');
            toast.className = 'toast';
            
            if (response.ok) {
                toast.innerHTML = `
                    <div class="toast-header" style="color: var(--primary-color);">REAL SMS SENT</div>
                    <div>Successfully delivered to ${member.contact} via Twilio!</div>
                `;
            } else {
                toast.style.borderLeftColor = 'var(--danger-color)';
                toast.innerHTML = `
                    <div class="toast-header" style="color: var(--danger-color);">SMS FAILED</div>
                    <div>Error: ${result.error || 'Failed to send'}</div>
                `;
            }

            toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('removing');
                toast.addEventListener('animationend', () => toast.remove());
            }, 8000);

        } catch (error) {
            console.error('Failed to connect to backend:', error);
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.borderLeftColor = 'var(--danger-color)';
            toast.innerHTML = `
                <div class="toast-header" style="color: var(--danger-color);">BACKEND ERROR</div>
                <div>Could not connect to the SMS server. Is Node.js running?</div>
            `;
            toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('removing');
                toast.addEventListener('animationend', () => toast.remove());
            }, 8000);
        }
    }

    // Search and filter
    searchInput.addEventListener('input', renderMembers);
    statusFilter.addEventListener('change', renderMembers);

    // Export to CSV
    exportBtn.addEventListener('click', () => {
        if (members.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = ["ID", "Name", "Contact", "Loan Amount", "Term (Months)", "Interest Rate (%)", "Purpose", "Monthly Payment", "Status", "Date Added"];
        const csvRows = [headers.join(',')];

        for (const m of members) {
            const row = [
                m.id,
                `"${m.name}"`,
                `"${m.contact}"`,
                m.loanAmount,
                m.termMonths,
                m.interestRate,
                `"${m.purpose}"`,
                m.monthlyPayment.toFixed(2),
                m.status,
                m.dateAdded
            ];
            csvRows.push(row.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'bank_members.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    function saveData() {
        localStorage.setItem('bankMembers', JSON.stringify(members));
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    }

    function updateStats() {
        totalMembersEl.textContent = members.length; // Show total members in system
        const totalLoan = members.reduce((sum, member) => sum + member.loanAmount, 0); // Show total loan of all members
        totalLoansEl.textContent = formatCurrency(totalLoan);
        updateCharts();
    }

    function updateCharts() {
        const statusCounts = { Pending: 0, Approved: 0, Rejected: 0 };
        const purposeTotals = { Personal: 0, Auto: 0, Mortgage: 0, Business: 0, Other: 0 };

        members.forEach(m => {
            if (statusCounts[m.status] !== undefined) {
                statusCounts[m.status]++;
            }
            if (purposeTotals[m.purpose] !== undefined) {
                purposeTotals[m.purpose] += m.loanAmount;
            } else {
                purposeTotals['Other'] += m.loanAmount;
            }
        });

        const statusCtx = document.getElementById('status-chart').getContext('2d');
        const purposeCtx = document.getElementById('purpose-chart').getContext('2d');

        if (statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Approved', 'Rejected'],
                datasets: [{
                    data: [statusCounts.Pending, statusCounts.Approved, statusCounts.Rejected],
                    backgroundColor: ['rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        if (purposeChartInstance) purposeChartInstance.destroy();
        purposeChartInstance = new Chart(purposeCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(purposeTotals),
                datasets: [{
                    label: 'Total Amount ($)',
                    data: Object.values(purposeTotals),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { callback: (val) => '$' + val } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function renderMembers() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterVal = statusFilter.value;

        const filteredMembers = members.filter(m => {
            const matchName = m.name.toLowerCase().includes(searchTerm);
            const matchStatus = filterVal === 'All' || m.status === filterVal;
            return matchName && matchStatus;
        });

        updateStats(); // Update stats based on full list
        
        memberList.innerHTML = '';
        
        if (filteredMembers.length === 0) {
            emptyState.classList.add('active');
            memberTable.style.display = 'none';
        } else {
            emptyState.classList.remove('active');
            memberTable.style.display = 'table';
            
            filteredMembers.forEach(member => {
                const tr = document.createElement('tr');
                
                const statusSelectOptions = ['Pending', 'Approved', 'Rejected'].map(s => 
                    `<option value="${s}" ${member.status === s ? 'selected' : ''}>${s}</option>`
                ).join('');

                tr.innerHTML = `
                    <td>
                        <strong>${member.name}</strong>
                        <span class="subtitle">${member.contact}</span>
                    </td>
                    <td>
                        ${formatCurrency(member.loanAmount)}
                        <span class="subtitle">${member.purpose} | ${member.termMonths} mo @ ${member.interestRate}%</span>
                    </td>
                    <td>
                        <strong>${formatCurrency(member.monthlyPayment)}</strong>/mo
                    </td>
                    <td>
                        <select class="status-select" onchange="updateStatus('${member.id}', this.value)">
                            ${statusSelectOptions}
                        </select>
                        <div style="margin-top:0.5rem">
                            <span class="status-badge ${member.status.toLowerCase()}">${member.status}</span>
                        </div>
                    </td>
                    <td>
                        <button class="btn-delete" onclick="deleteMember('${member.id}')">Delete</button>
                    </td>
                `;
                memberList.appendChild(tr);
            });
        }
    }
});
