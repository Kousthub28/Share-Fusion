// =======================
// Firebase Configuration
// =======================
const firebaseConfig = {
  apiKey: "",
  authDomain: "datatransfer-ba0e0.firebaseapp.com",
  projectId: "datatransfer-ba0e0",
  storageBucket: "datatransfer-ba0e0.appspot.com",
  messagingSenderId: "",
  appId: "",
  measurementId: "G-R6B5XZRRGE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log("🔥 Firebase initialized");

// =======================
// Cloudinary Configuration
// =======================
const CLOUD_NAME = "dpduvwpfo";
const UPLOAD_PRESET = "unsigned_upload";

// =======================
// Helper: Get Base URL (with fallback for local testing)
// =======================
function getBaseURL() {
  return window.location.origin || window.location.href.substring(0, window.location.href.lastIndexOf("/"));
}

// =======================
// Helper: Update Status Message
// =======================
function updateStatus(message) {
  const statusEl = document.getElementById("statusTicker");
  if (statusEl) {
    statusEl.innerText = message;
  }
}

// =======================
// Helper: Shorten URL with Bitly API
// =======================
async function shortenUrl(longUrl) {
  const BITLY_TOKEN = "ba4797e9455a29c124ba5b8c1eaf3d5660c58e9c"; // Replace with your Bitly Generic Access Token
  const apiUrl = "https://api-ssl.bitly.com/v4/shorten";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BITLY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        long_url: longUrl,
      }),
    });

    const data = await response.json();
    if (data.link) {
      console.log("✅ Shortened URL:", data.link);
      return data.link; // e.g., https://bit.ly/3xyz123
    } else {
      console.error("❌ Bitly API error:", data);
      return longUrl; // Fallback to original URL if shortening fails
    }
  } catch (error) {
    console.error("❌ Error shortening URL:", error);
    return longUrl; // Fallback to original URL on error
  }
}

// =======================
// Function: Upload File to Cloudinary
// =======================
function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Please select a file!");
    return;
  }
  
  const file = fileInput.files[0];
  updateStatus("📤 Uploading file...");
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  console.log("Uploading to:", uploadUrl);
  
  fetch(uploadUrl, {
    method: "POST",
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    console.log("📜 Cloudinary response:", data);
    if (data.secure_url) {
      console.log("✅ Secure URL:", data.secure_url);
      updateStatus("✅ File uploaded successfully! Generating shareable link...");
      saveFileUrlToDatabase(data.secure_url);
    } else {
      console.error("❌ Upload failed:", data);
      alert("❌ File upload failed. Check Cloudinary settings.");
      updateStatus("❌ Upload failed. Try again.");
    }
  })
  .catch(error => {
    console.error("❌ Error uploading file:", error);
    alert("❌ Error uploading file: " + error.message);
    updateStatus("❌ Upload failed. Try again.");
  });
}

// =======================
// Function: Save File URL to Firestore & Generate Shortened Shareable Link
// =======================
async function saveFileUrlToDatabase(fileUrl) {
  console.log("🔗 Saving file URL to Firestore:", fileUrl);
  try {
    const docRef = await db.collection("files").add({ fileUrl });
    const longShareableLink = `${getBaseURL()}/?fileId=${docRef.id}`;
    console.log("🔗 Generated long shareable link:", longShareableLink);

    // Shorten the URL
    updateStatus("🔗 Shortening URL...");
    const shortShareableLink = await shortenUrl(longShareableLink);
    updateStatus("✅ File uploaded and link shortened successfully!");
    displayFileLink(shortShareableLink, fileUrl);
  } catch (error) {
    console.error("❌ Error saving file URL:", error);
    alert("❌ Error saving file URL: " + error.message);
    updateStatus("❌ Error occurred. Try again.");
  }
}

// =======================
// Function: Display Shareable Link & QR Code for File Sharing
// =======================
function displayFileLink(shareableLink, fileUrl) {
  const shareLinkEl = document.getElementById("shareLink");
  if (shareLinkEl) {
    shareLinkEl.innerHTML = `
      <a href="${shareableLink}" target="_blank">${shareableLink}</a>
      <br>
      <strong>Direct File Link:</strong> <a href="${fileUrl}" target="_blank">${fileUrl}</a>
    `;
  }
  
  const qrContainer = document.getElementById("qrcode");
  if (qrContainer) {
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: shareableLink,
      width: 150,
      height: 150
    });
  }
}

// =======================
// Function: Upload Text to Firestore & Generate Shortened Shareable Link
// =======================
async function uploadText() {
  const textInput = document.getElementById("textInput");
  const text = textInput.value.trim();
  if (!text) {
    alert("Please enter some text!");
    return;
  }
  updateStatus("📤 Uploading text...");
  try {
    const docRef = await db.collection("texts").add({ content: text });
    const longShareableLink = `${getBaseURL()}/?textId=${docRef.id}`;
    console.log("🔗 Generated long text shareable link:", longShareableLink);

    // Shorten the URL
    updateStatus("🔗 Shortening URL...");
    const shortShareableLink = await shortenUrl(longShareableLink);
    updateStatus("✅ Text uploaded and link shortened successfully!");
    displayTextLink(shortShareableLink);
  } catch (error) {
    console.error("❌ Error uploading text:", error);
    alert("❌ Error uploading text: " + error.message);
    updateStatus("❌ Upload failed. Try again.");
  }
}

// =======================
// Function: Display Shareable Link & QR Code for Text Sharing
// =======================
function displayTextLink(shareableLink) {
  const shareTextEl = document.getElementById("shareTextLink");
  if (shareTextEl) {
    shareTextEl.innerHTML = `Your text shareable link: <a href="${shareableLink}" target="_blank">${shareableLink}</a>`;
  }
  
  const textQrContainer = document.getElementById("textQrcode");
  if (textQrContainer) {
    textQrContainer.innerHTML = "";
    new QRCode(textQrContainer, {
      text: shareableLink,
      width: 150,
      height: 150
    });
  }
}

// =======================
// Function: Fetch Shared Content on Page Load (Display Image or Text)
// =======================
function fetchSharedContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileId = urlParams.get("fileId");
  const textId = urlParams.get("textId");
  
  if (fileId) {
    console.log("🔍 Fetching file for ID:", fileId);
    db.collection("files").doc(fileId).get()
      .then(doc => {
        if (doc.exists) {
          const fileUrl = doc.data().fileUrl;
          console.log("🔗 Retrieved file URL from Firestore:", fileUrl);
          const fileDisplayEl = document.getElementById("fileDisplay");
          if (fileDisplayEl) {
            fileDisplayEl.innerHTML = `
              <p><strong>Shared Image:</strong></p>
              <img src="${fileUrl}" alt="Shared Image" style="max-width:100%; height:auto;">
              <br>
              <a href="${fileUrl}" target="_blank">Download File</a>
            `;
            document.getElementById("fileDisplayContainer").style.display = "block";
          } else {
            console.error("❌ No element with id 'fileDisplay' found.");
          }
        } else {
          console.error("❌ No file found for this ID!");
          alert("❌ No file found for this ID!");
        }
      })
      .catch(error => {
        console.error("❌ Error fetching file:", error);
        alert("❌ Error fetching file: " + error.message);
      });
  }
  
  if (textId) {
    console.log("🔍 Fetching text for ID:", textId);
    db.collection("texts").doc(textId).get()
      .then(doc => {
        if (doc.exists) {
          const textContent = doc.data().content;
          const displayTextEl = document.getElementById("displayText");
          if (displayTextEl) displayTextEl.innerText = textContent;
          const container = document.getElementById("displayTextContainer");
          if (container) container.style.display = "block";
          
          const textQrContainer = document.getElementById("textQrcode");
          if (textQrContainer) {
            textQrContainer.innerHTML = "";
            new QRCode(textQrContainer, {
              text: window.location.href,
              width: 150,
              height: 150
            });
          }
        } else {
          console.error("❌ No text found for this ID!");
          alert("❌ No text found for this ID!");
        }
      })
      .catch(error => {
        console.error("❌ Error fetching text:", error);
        alert("❌ Error fetching text: " + error.message);
      });
  }
}

// =======================
// Function: Copy Link to Clipboard
// =======================
function copyLink(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    // Extract text from link element
    const link = element.textContent.trim();
    navigator.clipboard.writeText(link).then(() => {
      alert("Link copied to clipboard!");
    }).catch(err => {
      console.error("Could not copy text: ", err);
    });
  }
}

// =======================
// On Page Load: Fetch Shared Content
// =======================
window.onload = function() {
  fetchSharedContent();
};
