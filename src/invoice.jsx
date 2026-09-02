import React, { useState, useRef, useEffect, useMemo } from "react";
import "./invoice.css";
import html2pdf from "html2pdf.js";
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";

const InvoiceGenerator = ({ userInfo, startDate, endDate, onClose }) => {
  // States for invoice generation
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSupplyData, setSelectedSupplyData] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Invoice specific states
  const [supplieName, setSupplierName] = useState("");
  const [poNumber, setPoNumber] = useState("");

  // Report date filter states (separate from main dashboard filters)
  const [reportStartDate, setReportStartDate] = useState(startDate || "");
  const [reportEndDate, setReportEndDate] = useState(endDate || "");

  // Fixed exchange rate (INR to USD) - set to 85.10
  const exchangeRate = 85.1;

  const pdfContainerRef = useRef(null);

  // List of all supply IDs to fetch for this user with supplier info
  const supplierInfo = useMemo(
    () => ({
      1010: { name: "AcutusAI" },
      7598: { name: "Erudite MR LLP" },
      3455: { name: "offerfiesta" },
      1001: { name: "GamerPe" },
      1003: { name: "DreamlockMR PVT. LTD." },
      1004: { name: "Market Mirror" },
      1009: { name: "Opinion Mint LLC" },
      1102: { name: "Insightcents" },
      1200: { name: "Panelsights" },
      1205: { name: "HorizonScope" },
      1206: { name: "Purelyresearch" },
      1108: { name: "Pass(OpinionMint)" },
      1208: { name: "Pass(Insightcents)" },
      1209: { name: "Pass(Purelyresearch)" },
      1300: { name: "OpinionMint_Fusion" },
    }),
    []
  );

  // Function to generate a unique PO number
  const generateUniquePoNumber = (supplyId) => {
    const today = new Date();
    const datePart = today.toISOString().split("T")[0].replace(/-/g, "");
    return `QMA-${supplyId}-${datePart}`;
  };

  // Initialize the modal when component mounts - auto-process data from dashboard
  useEffect(() => {
    console.log("Invoice useEffect triggered with:", {
      supplyID: userInfo.supplyID,
      startDate,
      endDate,
    });

    // Automatically process the data from dashboard without showing modal
    if (userInfo.supplyID && startDate && endDate) {
      console.log("All required data available, starting processData");
      const processData = async () => {
        const supplyId = userInfo.supplyID;
        const startDateValue = startDate;
        const endDateValue = endDate;

        setReportStartDate(startDateValue);
        setReportEndDate(endDateValue);

        setIsLoading(true);
        try {
          // Set supplier info
          const supplier = supplierInfo[supplyId] || {
            name: "Unknown Supplier",
            gst: "Not Available",
          };
          setSupplierName(supplier.name);
          setPoNumber(generateUniquePoNumber(supplyId));

          // Move fetchInvoiceData inside to avoid dependency issues
          const fetchInvoiceData = async () => {
            try {
              console.log("Fetching invoice data for Supply ID:", supplyId);
              console.log("Report Start Date:", startDateValue);
              console.log("Report End Date:", endDateValue);

              const response = await fetch(
                `https://api.qmapi.com/api/v2/survey/reporting/generate-invoice`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    supply_id: supplyId,
                    startDate: new Date(startDateValue).toISOString(),
                    endDate: new Date(endDateValue).toISOString(),
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const data = await response.json();
              return data;
            } catch (error) {
              console.error("Error fetching invoice data:", error);
              throw error;
            }
          };

          const result = await fetchInvoiceData();
          console.log("API Response:", result);

          // Check if result has the expected structure
          if (!result || !result.reportInfo) {
            throw new Error("Invalid API response structure");
          }

          setSelectedSupplyData({
            id: supplyId,
            totalCompletes: result.reportInfo.totalCount || 0,
            totalReconciliations: result.reportInfo.totalReconcileCount || 0,
            totalRevenueCompletes: (result.reportInfo.totalAmount || 0).toFixed(
              2
            ),
            totalRevenueReconciliations: (
              result.reportInfo.totalReconcileAmount || 0
            ).toFixed(2),
            totalRevenueCompletesINR: (
              (result.reportInfo.totalAmount || 0) * exchangeRate
            ).toFixed(2),
            totalRevenueReconciliationsINR: (
              (result.reportInfo.totalReconcileAmount || 0) * exchangeRate
            ).toFixed(2),
            supplierName: supplier.name,
          });

          setShowPdfPreview(true);
        } catch (error) {
          console.error("Error processing supply data:", error);
          alert("Error: " + error.message);
        } finally {
          setIsLoading(false);
        }
      };
      processData();
    } else {
      console.log("Missing required data:", {
        supplyID: userInfo.supplyID,
        startDate,
        endDate,
      });
      alert("Missing required data: Supply ID, Start Date, or End Date");
    }
  }, [userInfo.supplyID, startDate, endDate, supplierInfo]);

  // Process supply data for PDF
  const downloadPDF = () => {
    const element = document.getElementById("content-to-print");
    const opt = {
      filename: `${poNumber}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "legal", orientation: "portrait" },
    };
    // html2pdf().from(element).save();
    html2pdf().from(element).set(opt).save();
  };

  // Close PDF preview
  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    setSelectedSupplyData(null);
    onClose();
  };

  // For now, allow all users to access the feature since userInfo doesn't contain email
  const isAuthorized = true;

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="invoice-generator">
      <h2>Invoice Generator Loaded Successfully</h2>
      <p>UserInfo: {JSON.stringify(userInfo)}</p>
      <p>Start Date: {startDate}</p>
      <p>End Date: {endDate}</p>

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Processing data...</p>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && selectedSupplyData && (
        <div className="modal-overlay">
          <div className="modal-content pdf-preview">
            <h3>Statement Preview - Supply ID {selectedSupplyData.id}</h3>

            {/* actual container */}
            <div
              className="pdf-container"
              id="content-to-print"
              ref={pdfContainerRef}
            >
              {/* Updated PDF preview layout to match new design */}
              <div className="pdf-header">
                <div className="company-logo-centered">
                  <div className="acutus-logo">
                    <img
                      src="/logo.png"
                      alt="Acutus AI Logo"
                      className="logo-img"
                    />
                    <p>ACUTUS AI</p>
                  </div>
                </div>
                <h2 className="invoice-title">STATEMENT</h2>
              </div>

              <div className="invoice-details">
                <div className="invoice-meta">
                  <p>
                    <strong>Date:</strong> {new Date().toLocaleDateString()}
                  </p>
                  <p>
                    <strong>PO Number:</strong> {poNumber}
                  </p>
                  {(reportStartDate || reportEndDate) && (
                    <p>
                      <strong>Service Period:</strong>{" "}
                      {reportStartDate || "All"} to {reportEndDate || "All"}
                    </p>
                  )}
                </div>

                <div className="supplier-info">
                  <p>
                    <strong>Supply ID:</strong> {selectedSupplyData.id}
                  </p>
                  <p>
                    <strong>Supplier:</strong>{" "}
                    {supplierInfo[selectedSupplyData.id]?.name || "N/A"}
                  </p>
                </div>
              </div>

              <div className="invoice-items">
                <h3>Billing Details</h3>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Amount (₹)</th>
                      <th>Amount ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Completed Surveys</td>
                      <td>
                        {selectedSupplyData.totalCompletes +
                          selectedSupplyData.totalReconciliations}
                      </td>
                      <td>
                        ₹
                        {(
                          parseFloat(
                            selectedSupplyData.totalRevenueCompletesINR
                          ) +
                          parseFloat(
                            selectedSupplyData.totalRevenueReconciliationsINR
                          )
                        ).toFixed(2)}
                      </td>
                      <td>
                        $
                        {(
                          parseFloat(selectedSupplyData.totalRevenueCompletes) +
                          parseFloat(
                            selectedSupplyData.totalRevenueReconciliations
                          )
                        ).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td>Adjustments (Reconciliations)</td>
                      <td>{selectedSupplyData.totalReconciliations}</td>
                      <td>
                        (₹{selectedSupplyData.totalRevenueReconciliationsINR})
                      </td>
                      <td>
                        (${selectedSupplyData.totalRevenueReconciliations})
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    {/* Calculate values */}
                    {(() => {
                      const revenueCompletesUsd = parseFloat(
                        selectedSupplyData.totalRevenueCompletes
                      );

                      const revenueCompletesInr = parseFloat(
                        selectedSupplyData.totalRevenueCompletesINR
                      );

                      // Calculate net amounts (completes - reconciliations)
                      const netAmountUsd = revenueCompletesUsd.toFixed(2);
                      const netAmountInr = revenueCompletesInr.toFixed(2);

                      // Calculate total
                      const totalInr = parseFloat(netAmountInr).toFixed(2);

                      return (
                        <>
                          <tr className="total-row">
                            <td colSpan="1"></td>
                            <td>Total Billable Amount:</td>
                            <td>₹{totalInr}</td>
                            <td>${netAmountUsd}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>

              <div className="invoice-footer">
                <p>
                  <strong>
                    Please submit an invoice to accounting@acutusai.com for the
                    Billable Total above.
                  </strong>
                </p>
                <p>
                  <strong>Exchange Rate:</strong> $1 = ₹
                  {exchangeRate.toFixed(2)} (30 June 2025)
                </p>
                <p className="notes">
                  <strong>Note:</strong> This is a computer-generated statement
                  and does not require a signature.
                </p>
              </div>

              <div className="company-footer">
                <p>ACUTUS AI INSIGHTS PRIVATE LIMITED</p>
                <p>CIN: U63119UP2024PTC208724</p>
                <p>GST IN: 09ABBCA3145R1ZA</p>
                <p>
                  REGISTERED ADDRESS: F-1902, CLOUD 9 TOWERS, AHMSA KHAND II
                </p>
                <p>INDIRAPURAM, GHAZIABAD, UTTAR PRADESH, 201014</p>
              </div>

              {/* Vertical green stripes */}
              <div className="right-stripes"></div>
            </div>

            <div className="pdf-preview-actions">
              <button onClick={handleClosePdfPreview} className="close-button">
                Close
              </button>
              <button onClick={downloadPDF} className="download-button">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerator;
