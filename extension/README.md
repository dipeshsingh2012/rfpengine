# RFQEngine browser extension POC

1. Start the FastAPI backend on `http://localhost:8000`.
2. In Chrome or Edge, open `chrome://extensions` or `edge://extensions`.
3. Enable Developer mode and choose **Load unpacked**.
4. Select this `extension/` directory.
5. Open `http://localhost:5173/mock-questionnaire.html`.
6. Click the RFQEngine extension icon, choose **Scan page**, generate an answer, review it, and choose **Insert answer**.

The extension never auto-submits the questionnaire. It only inserts an answer after explicit seller approval.
