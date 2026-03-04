
   1. Navigate to the backend directory:
   1     cd backend
   2. Activate the virtual environment:
   1     source venv/bin/activate
   3. (Optional) Seed the database:
      If you want to regenerate the mock data and retrain the models:
   1     python generate_data.py
   4. Run the server:
   1     python main.py
      The API will be available at http://localhost:8000.

   x 2. Start the Frontend Dashboard (React + Vite)
   1. Open a new terminal window and navigate to the frontend directory:
   1     cd frontend
   2. Install dependencies:
   1     npm install
   3. Run the development server:
   1     npm run dev
      The dashboard will typically be available at http://localhost:5173.  

      SMART ESG PERFORMANCE MONITORING SYSTEM
    


    
WEBSITE PAGE FLOW

1. Login Page
   - User authentication
   - Email and password login
   - JWT token generation
   - Redirect to dashboard

2. Register Page
   - Create new user account
   - Assign user role (Admin / Analyst / Manager)
   - Store encrypted password in database

3. Dashboard Page
   - Display overall ESG score
   - KPI cards for Environmental, Social, Governance
   - ESG trend visualization
   - Risk indicator summary
   - Recent alerts

4. Company Management Page
   - Add / Edit / Delete company
   - Upload ESG dataset
   - View company profile
   - Admin access only

5. ESG Analytics Page
   - Detailed Environmental metrics graph
   - Social metrics analysis
   - Governance performance chart
   - Radar chart for ESG comparison
   - Heatmap visualization

6. Risk & Anomaly Detection Page
   - ESG risk classification (Low / Medium / High)
   - Display detected anomalies
   - Historical abnormal data trends
   - Alert severity display

7. Forecast & Prediction Page
   - ESG score prediction
   - Future performance forecast
   - Machine learning confidence score
   - Trend comparison graph

8. Reports Page
   - Generate ESG performance report (PDF)
   - Download company ESG report
   - Export data as CSV
   - Summary insights

9. Admin Panel Page
   - Manage users and roles
   - Assign permissions
   - Retrain machine learning model
   - View system logs
   - Monitor system activity

System Navigation Flow:
Login → Dashboard → Functional Modules (Analytics / Risk / Forecast / Reports / Admin)