document.addEventListener('DOMContentLoaded', () => {
    const memberForm = document.getElementById('member-form');
    const memberList = document.getElementById('member-list');
    const emptyState = document.getElementById('empty-state');
    const totalMembersEl = document.getElementById('total-members');
    const totalLoansEl = document.getElementById('total-loans');
    const memberTable = document.getElementById('member-table');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const exportBtn = document.getElementById('export-btn');

    // State
    let members = JSON.parse(localStorage.getItem('bankMembers')) || [];

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
            member.status = newStatus;
            saveData();
            renderMembers();
        }
    };

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

    function updateStats(filteredMembers) {
        totalMembersEl.textContent = members.length; // Show total members in system
        const totalLoan = members.reduce((sum, member) => sum + member.loanAmount, 0); // Show total loan of all members
        totalLoansEl.textContent = formatCurrency(totalLoan);
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
