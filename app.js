document.addEventListener('DOMContentLoaded', () => {
    const memberForm = document.getElementById('member-form');
    const memberList = document.getElementById('member-list');
    const emptyState = document.getElementById('empty-state');
    const totalMembersEl = document.getElementById('total-members');
    const totalLoansEl = document.getElementById('total-loans');
    const memberTable = document.getElementById('member-table');

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

        const newMember = {
            id: Date.now().toString(),
            name: nameInput.value.trim(),
            contact: contactInput.value.trim(),
            loanAmount: parseFloat(loanInput.value)
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
        totalMembersEl.textContent = members.length;
        const totalLoan = members.reduce((sum, member) => sum + member.loanAmount, 0);
        totalLoansEl.textContent = formatCurrency(totalLoan);
    }

    function renderMembers() {
        updateStats();
        
        memberList.innerHTML = '';
        
        if (members.length === 0) {
            emptyState.classList.add('active');
            memberTable.style.display = 'none';
        } else {
            emptyState.classList.remove('active');
            memberTable.style.display = 'table';
            
            members.forEach(member => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${member.name}</td>
                    <td>${member.contact}</td>
                    <td>${formatCurrency(member.loanAmount)}</td>
                    <td>
                        <button class="btn-delete" onclick="deleteMember('${member.id}')">Delete</button>
                    </td>
                `;
                memberList.appendChild(tr);
            });
        }
    }
});
