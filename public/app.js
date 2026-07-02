// Frontend Controller - Fair Split

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const imagePreview = document.getElementById('image-preview');
  const removeImageBtn = document.getElementById('remove-image');
  const descriptionInput = document.getElementById('description-input');
  const splitForm = document.getElementById('split-form');
  const submitBtn = document.getElementById('submit-btn');

  // Output States
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const resultState = document.getElementById('result-state');
  const errorMessage = document.getElementById('error-message');

  // Result Elements
  const grandTotalEl = document.getElementById('result-grand-total');
  const payerEl = document.getElementById('result-payer');
  const reconBadge = document.getElementById('result-reconciliation-badge');
  const splitTableBody = document.getElementById('split-table-body');
  const settleUpList = document.getElementById('settle-up-list');
  const assumptionsList = document.getElementById('assumptions-list');
  const flagsSection = document.getElementById('flags-section');
  const flagsList = document.getElementById('flags-list');

  // Stored base64 image data
  let uploadedImageBase64 = null;

  // Preset Configurations
  const presets = {
    R1: {
      description: "Three of us — Ravi, Neha, Sameer. Ravi had the cappuccino and the sandwich. Neha had the pasta and the lime soda. Sameer had the brownie. Sameer paid.",
      billName: "Brew & Bite Café",
      lines: [
        "   BREW & BITE CAFE   ",
        "Koramangala, Bengaluru",
        "  Bill #0142 | 12 Mar 2026",
        "-----------------------------",
        "Cappuccino         1   180.00",
        "Gr. Chicken Sand.  1   260.00",
        "Penne Arrabiata    1   320.00",
        "Fresh Lime Soda    1   120.00",
        "Brownie            1   160.00",
        "-----------------------------",
        "Subtotal:             1040.00",
        "Service 5%:             52.00",
        "GST 5%:                 54.60",
        "Round-off:              +0.40",
        "-----------------------------",
        "GRAND TOTAL:          ₹1147.00"
      ]
    },
    R2: {
      description: "Four of us: Aman, Priya, Karan, Sara. The Gulab Jamun was shared just by Priya and Karan. Everything else was common to all four. Priya paid.",
      billName: "Tamarind Kitchen",
      lines: [
        "  TAMARIND KITCHEN   ",
        "  HSR Layout, Bengaluru",
        "  Bill #2207 | 14 Mar 2026",
        "-----------------------------",
        "Paneer Butter Mas. 1   320.00",
        "Dal Makhani        1   260.00",
        "Butter Naan        4   240.00",
        "Jeera Rice         1   180.00",
        "Gulab Jamun        2   120.00",
        "Masala Papad       2   100.00",
        "-----------------------------",
        "Subtotal:             1220.00",
        "Service 5%:             61.00",
        "GST 5%:                 64.05",
        "Round-off:              -0.05",
        "-----------------------------",
        "GRAND TOTAL:          ₹1345.00"
      ]
    },
    R3: {
      description: "Ishaan, Meera, Rohit. Pizza, pasta and garlic bread shared equally by all three. The two beers were Ishaan and Rohit only. The mojito was Meera’s. Rohit paid.",
      billName: "The Daily Grind",
      lines: [
        "   THE DAILY GRIND    ",
        "    Powai, Mumbai",
        "  Bill #1188 | 15 Mar 2026",
        "-----------------------------",
        "Margherita Pizza   1   380.00",
        "Arrabiata Pasta    1   340.00",
        "Garlic Bread       1   160.00",
        "Craft Beer         2   500.00",
        "Virgin Mojito      1   180.00",
        "-----------------------------",
        "Subtotal:             1560.00",
        "Service 5%:             78.00",
        "GST 5%:                 81.90",
        "Round-off:              +0.10",
        "-----------------------------",
        "GRAND TOTAL:          ₹1720.00"
      ]
    },
    R4: {
      description: "Dev and Nikhil each had a chicken biryani. Anjali had the veg biryani. Farah had the rogan josh. The raita and soft drinks were common to all four. We used a 15% off coupon. Anjali paid.",
      billName: "Spice Route",
      lines: [
        "     SPICE ROUTE      ",
        "Jubilee Hills, Hyderabad",
        "  Bill #5521 | 16 Mar 2026",
        "-----------------------------",
        "Chicken Biryani    2   560.00",
        "Veg Biryani        1   240.00",
        "Mutton Rogan Josh  1   420.00",
        "Raita              2   120.00",
        "Soft Drinks        3   180.00",
        "-----------------------------",
        "Subtotal:             1520.00",
        "Discount 15%:         -228.00",
        "Service 5%:             76.00",
        "GST 5%:                 68.40",
        "Round-off:              -0.40",
        "-----------------------------",
        "GRAND TOTAL:          ₹1436.00"
      ]
    }
  };

  // --- Image Upload Interaction ---
  
  // Drag and Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Browse click
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImageBase64 = e.target.result;
      imagePreview.src = uploadedImageBase64;
      dropZone.style.display = 'none';
      previewContainer.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  // Remove Image
  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadedImageBase64 = null;
    imagePreview.src = '';
    fileInput.value = '';
    previewContainer.style.display = 'none';
    dropZone.style.display = 'block';
  });

  // --- Presets Helper (Draw on Canvas) ---
  function generateReceiptImage(presetKey) {
    const preset = presets[presetKey];
    if (!preset) return;

    // Create a virtual canvas to draw a receipt
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');

    // Draw receipt style background
    ctx.fillStyle = '#fdfdfd'; // receipt paper off-white
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle receipt border shading
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Receipt header text (thermal font style)
    ctx.fillStyle = '#1e293b'; // dark ink
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';

    let y = 40;
    preset.lines.forEach((line, index) => {
      // Different formatting for title
      if (index === 0) {
        ctx.font = 'bold 22px "Courier New", Courier, monospace';
        ctx.fillText(line, canvas.width / 2, y);
        y += 28;
      } else if (index === 1 || index === 2) {
        ctx.font = '14px "Courier New", Courier, monospace';
        ctx.fillStyle = '#64748b'; // lighter ink for address/info
        ctx.fillText(line, canvas.width / 2, y);
        y += 20;
      } else {
        ctx.font = '15px "Courier New", Courier, monospace';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'left';
        
        // Left & right alignment for item lines
        if (line.includes('   ') && !line.startsWith('---')) {
          const parts = line.split(/\s{2,}/);
          if (parts.length >= 2) {
            const leftText = parts[0];
            const rightText = parts[parts.length - 1];
            ctx.fillText(leftText, 25, y);
            ctx.textAlign = 'right';
            ctx.fillText(rightText, canvas.width - 25, y);
          } else {
            ctx.fillText(line, 25, y);
          }
        } else {
          // Centered lines or dividers
          ctx.textAlign = 'center';
          ctx.fillText(line, canvas.width / 2, y);
        }
        y += 24;
      }
    });

    // Convert canvas to Data URL (base64)
    uploadedImageBase64 = canvas.toDataURL('image/jpeg');
    imagePreview.src = uploadedImageBase64;
    dropZone.style.display = 'none';
    previewContainer.style.display = 'flex';
  }

  // Preset Buttons Event Listeners
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const preset = presets[presetKey];
      
      if (preset) {
        descriptionInput.value = preset.description;
        generateReceiptImage(presetKey);
      }
    });
  });

  // --- Form Submit & API Call ---
  splitForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!uploadedImageBase64) {
      alert('Please upload a receipt image or select one of the quick presets to test.');
      return;
    }

    if (!descriptionInput.value.trim()) {
      alert('Please enter a description of who had what.');
      return;
    }

    // Set UI States
    emptyState.style.display = 'none';
    resultState.style.display = 'none';
    errorState.style.display = 'none';
    loadingState.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').innerText = 'Processing...';

    try {
      const payload = {
        receipt_base64: uploadedImageBase64,
        description: descriptionInput.value.trim()
      };

      const response = await fetch('/api/split', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Server error occurred.');
      }

      const data = await response.json();
      renderResults(data);

      loadingState.style.display = 'none';
      resultState.style.display = 'block';
    } catch (err) {
      console.error(err);
      errorMessage.innerText = err.message || 'Could not connect to the splitting service. Check console logs for details.';
      loadingState.style.display = 'none';
      errorState.style.display = 'flex';
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('.btn-text').innerText = 'Compute Fair Split';
    }
  });

  // --- Render Results to UI ---
  function renderResults(data) {
    // 1. Stats Row
    grandTotalEl.innerText = `₹${data.grand_total}`;
    payerEl.innerText = data.paid_by || 'Unknown';

    // Reconciliation Badge
    reconBadge.className = 'badge';
    if (data.reconciliation.matches_bill) {
      reconBadge.innerText = 'Reconciled ✓';
      reconBadge.classList.add('badge-success');
    } else {
      reconBadge.innerText = 'Discrepancy ✗';
      reconBadge.classList.add('badge-danger');
    }

    // 2. Clear & Inject Per Person Table
    splitTableBody.innerHTML = '';
    data.per_person.forEach(p => {
      const tr = document.createElement('tr');
      
      const itemsList = p.items.length > 0 
        ? p.items.join(', ') 
        : '<span class="text-muted">None</span>';

      tr.innerHTML = `
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td class="items-cell">${itemsList}</td>
        <td>₹${p.subtotal}</td>
        <td>₹${p.tax_share}</td>
        <td>₹${p.service_share}</td>
        <td>₹${p.discount_share}</td>
        <td class="total-cell">₹${p.total}</td>
      `;
      splitTableBody.appendChild(tr);
    });

    // 3. Settle Up Checklist
    settleUpList.innerHTML = '';
    if (data.settle_up && data.settle_up.length > 0) {
      data.settle_up.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'settle-up-item';
        
        const checkboxId = `settle-check-${index}`;
        li.innerHTML = `
          <input type="checkbox" id="${checkboxId}" class="settle-checkbox">
          <label for="${checkboxId}" class="settle-text">
            <strong>${escapeHtml(item.from)}</strong> pays <strong>${escapeHtml(item.to)}</strong>
            <span class="font-accent" style="-webkit-text-fill-color: initial; color: var(--accent-cyan); font-weight: 700;">₹${item.amount}</span>
          </label>
        `;

        // Toggle completed class
        const checkbox = li.querySelector('.settle-checkbox');
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            li.classList.add('completed');
          } else {
            li.classList.remove('completed');
          }
        });

        settleUpList.appendChild(li);
      });
    } else {
      settleUpList.innerHTML = `<li class="settle-up-item"><span class="settle-text text-muted">No transactions needed. Everyone is settled.</span></li>`;
    }

    // 4. Assumptions
    assumptionsList.innerHTML = '';
    if (data.assumptions && data.assumptions.length > 0) {
      data.assumptions.forEach(asm => {
        const li = document.createElement('li');
        li.innerText = asm;
        assumptionsList.appendChild(li);
      });
    } else {
      assumptionsList.innerHTML = '<li>No special assumptions made.</li>';
    }

    // 5. Flags
    flagsList.innerHTML = '';
    if (data.flags && data.flags.length > 0) {
      data.flags.forEach(flag => {
        const li = document.createElement('li');
        li.innerText = flag;
        flagsList.appendChild(li);
      });
      flagsSection.style.display = 'block';
    } else {
      flagsSection.style.display = 'none';
    }
  }

  // Helper to prevent XSS in table injections
  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
});
