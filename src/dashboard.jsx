import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./dashboard.css";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import InvoiceGenerator from "./invoice.jsx";

// Constants
const SUPPLY_IDS = [
  { id: "1010", name: "Acutus AI" },
  { id: "3455", name: "Offerfista" },
  { id: "1001", name: "GamerPe" },
  { id: "1003", name: "DreamLock" },
  { id: "1004", name: "MarketMirror" },
  { id: "1121", name: "hkyssurvey" },
  { id: "1007", name: "BigTrunk" },
  { id: "1009", name: "OpinionMint" },
  { id: "7598", name: "EruditeMR" },
  { id: "1102", name: "Insightcents" },
  { id: "1106", name: "OpinionUniverse" },
  { id: "1200", name: "Panelsights" },
  { id: "1205", name: "HorizonScope" },
  { id: "1206", name: "Purelyresearch" },
  { id: "1108", name: "Pass(OpinionMint)" },
  { id: "1208", name: "Pass(Insightcents)" },
  { id: "1209", name: "Pass(Purelyresearch)" },
  { id: "1300", name: "OpinionMint_Fusion" },
  { id: "1201", name: "PassReasearch" },
  { id: "1105", name: "OpinionMintUSRouter" },
  { id: "1101", name: "Realsays1" },
  { id: "1103", name: "Realsays2" },
  { id: "1104", name: "Realsays3" },
  { id: "1118", name: "Mratsinsights" },
  { id: "1116", name: "JUNE" },
  { id: "1117", name: "Techbuddiesit" },
];

const COUNTRY_MAP = {
  eng_us: "US",
  eng_US: "US",
  eng_in: "IN",
  may_my: "MY",
  ara_eg: "EG",
  eng_au: "AU",
  eng_sg: "SG",
  ara_ae: "UAE",
  ara_qa: "QA",
  ara_sa: "SA",
};

const CHART_COLORS = {
  status: {
    complete: "#00bf63",
    quality: "#007bff",
    overquota: "#FFBB28",
    terminate: "#FF6B6B",
  },
  dtect: { good: "#00bf63", bad: "#FF0000", suspicious: "#FFBB28" },
  buyer: { CINT: "#007bff", FUSION: "#8A2BE2", PASS: "#FFBB28" },
};

const API_CONFIG = {
  baseUrl: "https://api.qmapi.com/api/v2/survey/reporting",
  headers: { authorization: "SampleApiKey" },
};

// Utility functions
const getCountryName = (code) => {
  if (!code || code === "Unknown" || code === "ara_in" || code === "ara_")
    return null;
  return COUNTRY_MAP[code.toLowerCase()] || code;
};

const fetchSurveyData = async (supplyID) => {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/${supplyID}`, {
      headers: API_CONFIG.headers,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    return Array.isArray(result) ? result : [result];
  } catch (error) {
    console.error(`Error fetching data for ${supplyID}:`, error);
    return [];
  }
};

const downloadCSV = (data, filename) => {
  const headers = ["AID", "status", "Desiredcpi", "createdAt", "updatedAt"];
  const csvString = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => `"${row[h] || ""}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Custom hooks
const useFilters = (data) => {
  const [filters, setFilters] = useState({
    buyers: { all: true, CINT: true, FUSION: true, PASS: true },
    suppliers: { all: true },
    countries: { all: true },
    dateRange: { startDate: "", endDate: "", startTime: "", endTime: "" },
  });

  const [suppliers, countries] = useMemo(() => {
    const uniqueSuppliers = [
      ...new Set(
        data.map(
          (item) => item.SupplierName || item.supplierInfo?.name || "Unknown",
        ),
      ),
    ];

    const uniqueCountries = [
      ...new Set(
        data
          .map((item) => {
            const countryName = getCountryName(item.country_language);
            if (countryName) item.countryDisplay = countryName;
            return countryName;
          })
          .filter(Boolean),
      ),
    ];

    return [uniqueSuppliers, uniqueCountries];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Buyer filter
      const provider = (item.surveyProvider || "CINT").toUpperCase();
      if (!filters.buyers.all && !filters.buyers[provider]) return false;

      // Supplier filter
      if (!filters.suppliers.all) {
        const supplier =
          item.SupplierName || item.supplierInfo?.name || "Unknown";
        if (!filters.suppliers[supplier]) return false;
      }

      // Country filter
      if (!filters.countries.all) {
        const countryName =
          item.countryDisplay || getCountryName(item.country_language);
        if (!countryName || !filters.countries[countryName]) return false;
      }

      // Date/time filter
      if (
        filters.dateRange.startDate ||
        filters.dateRange.endDate ||
        filters.dateRange.startTime ||
        filters.dateRange.endTime
      ) {
        // Use updatedAt for reconciliation status, createdAt for others
        const dateToUse =
          item.status === "reconciliation" ? item.updatedAt : item.createdAt;
        const itemDate = new Date(dateToUse);
        // Convert to IST (UTC+5:30)
        const istDate = new Date(itemDate.getTime() + 5.5 * 60 * 60 * 1000);
        const dateStr = istDate.toISOString().split("T")[0];
        const timeStr =
          istDate.getHours().toString().padStart(2, "0") +
          ":" +
          istDate.getMinutes().toString().padStart(2, "0") +
          ":" +
          istDate.getSeconds().toString().padStart(2, "0");

        if (
          filters.dateRange.startDate &&
          dateStr < filters.dateRange.startDate
        )
          return false;
        if (filters.dateRange.endDate && dateStr > filters.dateRange.endDate)
          return false;
        if (
          filters.dateRange.startTime &&
          timeStr < filters.dateRange.startTime
        )
          return false;
        if (filters.dateRange.endTime && timeStr > filters.dateRange.endTime)
          return false;
      }

      return true;
    });
  }, [data, filters]);

  const resetFilters = useCallback(() => {
    setFilters({
      buyers: { all: true, CINT: true, FUSION: true, PASS: true },
      suppliers: {
        all: true,
        ...Object.fromEntries(suppliers.map((s) => [s, true])),
      },
      countries: {
        all: true,
        ...Object.fromEntries(countries.map((c) => [c, true])),
      },
      dateRange: { startDate: "", endDate: "", startTime: "", endTime: "" },
    });
  }, [suppliers, countries]);

  useEffect(() => {
    if (suppliers.length > 0 && countries.length > 0) {
      setFilters((prev) => ({
        ...prev,
        suppliers: {
          all: true,
          ...Object.fromEntries(suppliers.map((s) => [s, true])),
        },
        countries: {
          all: true,
          ...Object.fromEntries(countries.map((c) => [c, true])),
        },
      }));
    }
  }, [suppliers, countries]);

  return {
    filters,
    setFilters,
    filteredData,
    suppliers,
    countries,
    resetFilters,
  };
};

// Components
const FilterSection = ({
  title,
  options,
  selected,
  onSelectionChange,
  visible,
  onToggle,
}) => (
  <div className="filter-group">
    <div className="filter-header">
      <h3>{title}</h3>
      <button className="toggle-btn" onClick={onToggle}>
        {visible ? "Hide" : "Show"}
      </button>
    </div>
    {visible && (
      <div className="checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={selected.all}
            onChange={(e) => {
              const isChecked = e.target.checked;
              const newSelection = { all: isChecked };
              options.forEach((opt) => (newSelection[opt] = isChecked));
              onSelectionChange(newSelection);
            }}
          />
          All
        </label>
        {options.map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              checked={selected[option] || false}
              onChange={(e) => {
                const newSelection = {
                  ...selected,
                  [option]: e.target.checked,
                };
                newSelection.all = options.every((opt) => newSelection[opt]);
                onSelectionChange(newSelection);
              }}
            />
            {option}
          </label>
        ))}
      </div>
    )}
  </div>
);

const MetricCard = ({ title, value }) => (
  <div className="card">
    <h3>{title}</h3>
    <div className="metric-value">{value}</div>
  </div>
);

const PieChartComponent = ({ title, data, colorMap }) => (
  <div className="chart-container">
    <h3>{title}</h3>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={Object.entries(data).map(([name, value]) => ({ name, value }))}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          dataKey="value"
        >
          {Object.entries(data).map(([name], index) => (
            <Cell key={`cell-${index}`} fill={colorMap[name] || "#8884D8"} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

const Modal = ({ title, children, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        {children}
        <div className="modal-buttons">
          <button
            onClick={onClose}
            className="reset-btn"
            style={{ backgroundColor: "#00bf63", color: "#fff" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const SurveyDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState({
    buyers: false,
    suppliers: false,
    countries: false,
  });
  const [modals, setModals] = useState({
    statement: false,
    csv: false,
    invoice: false,
  });
  const [formData, setFormData] = useState({
    statement: { supplyID: "", startDate: "", endDate: "" },
    csv: { supplyID: "", startDate: "", endDate: "" },
  });

  const {
    filters,
    setFilters,
    filteredData,
    suppliers,
    countries,
    resetFilters,
  } = useFilters(data);

  // Fetch data with parallel requests and caching
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const promises = SUPPLY_IDS.map((supplier) =>
        fetchSurveyData(supplier.id).then((data) =>
          data.map((item) => ({ ...item, supplierInfo: supplier })),
        ),
      );

      const results = await Promise.all(promises);
      const allData = results.flat();
      setData(allData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredData.length;
    const completed = filteredData.filter(
      (item) => item.status === "complete",
    ).length;
    const nullParent = filteredData.filter(
      (item) => item.Parent_id === "N/A",
    ).length;
    const terminate = filteredData.filter(
      (item) => item.status === "terminate",
    ).length;
    const overquota = filteredData.filter(
      (item) => item.status === "overquota",
    ).length;
    const quality = filteredData.filter(
      (item) => item.status === "quality",
    ).length;
    const reconciliation = filteredData.filter(
      (item) => item.status === "reconciliation",
    ).length;

    const totalStatusSum = completed + terminate + overquota + quality;
    const conversionRate =
      totalStatusSum > 0 ? ((completed / totalStatusSum) * 100).toFixed(2) : 0;

    // Calculate total entries with specific statuses
    const totalEntriesWithStatus = filteredData.filter(
      (item) =>
        item.Parent_id === "N/A" &&
        ["complete", "terminate", "overquota", "quality"].includes(item.status),
    ).length;
    const conversionPercent =
      totalEntriesWithStatus > 0
        ? ((completed / totalEntriesWithStatus) * 100).toFixed(2)
        : 0;

    // Calculate Total Revenue from completed surveys using 'original' parameter
    const totalRevenue = filteredData
      .filter((item) => item.status === "complete")
      .reduce((sum, item) => {
        const originalValue =
          item.original !== "N/A" ? parseFloat(item.original) : 0;
        return sum + (isNaN(originalValue) ? 0 : originalValue);
      }, 0);

    // Calculate Total Payable from completed surveys using 'Desiredcpi' parameter
    const totalPayable = filteredData
      .filter((item) => item.status === "complete")
      .reduce((sum, item) => {
        const desiredCpiValue =
          item.Desiredcpi !== "N/A" ? parseFloat(item.Desiredcpi) : 0;
        return sum + (isNaN(desiredCpiValue) ? 0 : desiredCpiValue);
      }, 0);

    const marginAmount = totalRevenue - totalPayable;
    const marginPercent =
      totalRevenue > 0 ? ((marginAmount / totalRevenue) * 100).toFixed(2) : 0;

    return {
      total,
      completed,
      nullParent,
      conversionRate,
      conversionPercent,
      totalRevenue,
      totalPayable,
      marginAmount,
      marginPercent,
      reconciliation,
    };
  }, [filteredData]);

  // Chart data
  const chartData = useMemo(() => {
    const statusData = {};
    const dtectData = { good: 0, bad: 0, suspicious: 0 };
    const buyerData = { CINT: 0, FUSION: 0, PASS: 0 };
    const supplierPerformance = {};

    filteredData.forEach((item) => {
      // Status distribution
      statusData[item.status] = (statusData[item.status] || 0) + 1;

      // Dtect score
      if (
        item.dtectScore &&
        Object.prototype.hasOwnProperty.call(dtectData, item.dtectScore)
      ) {
        dtectData[item.dtectScore]++;
      }

      // Buyer distribution (completed only)
      if (item.status === "complete") {
        const provider = (item.surveyProvider || "CINT").toUpperCase();
        if (Object.prototype.hasOwnProperty.call(buyerData, provider)) {
          buyerData[provider]++;
        }
      }

      // Supplier performance
      const supplierName =
        item.SupplierName || item.supplierInfo?.name || "Unknown";
      if (!supplierPerformance[supplierName]) {
        supplierPerformance[supplierName] = {
          total: 0,
          completed: 0,
          revenue: 0,
        };
      }

      supplierPerformance[supplierName].total++;
      if (item.status === "complete") {
        supplierPerformance[supplierName].completed++;
        if (item.original && item.original !== "N/A") {
          supplierPerformance[supplierName].revenue +=
            parseFloat(item.original) || 0;
        }
      }
    });

    const top10Suppliers = Object.entries(supplierPerformance)
      .map(([name, data]) => ({
        name,
        ...data,
        conversionRate:
          data.total > 0 ? ((data.completed / data.total) * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);

    return { statusData, dtectData, buyerData, top10Suppliers };
  }, [filteredData]);

  // Event handlers
  const handleFormSubmit = async (type) => {
    const form = formData[type];
    if (!form.supplyID || !form.startDate || !form.endDate) {
      alert("Please fill in all required fields");
      return;
    }

    if (type === "csv") {
      try {
        const data = await fetchSurveyData(form.supplyID);
        const filtered = data.filter((item) => {
          // Use updatedAt for reconciliation status, createdAt for others
          const dateToUse =
            item.status === "reconciliation" ? item.updatedAt : item.createdAt;
          const itemDate = new Date(dateToUse);
          // Convert all dates to IST for comparison
          const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
          const istItemDate = new Date(itemDate.getTime() + istOffset);
          const istStartDate = new Date(
            new Date(form.startDate).getTime() + istOffset,
          );
          const istEndDate = new Date(
            new Date(form.endDate).getTime() + istOffset,
          );
          // Set end date to end of day in IST
          istEndDate.setHours(23, 59, 59, 999);

          const validStatus =
            item.status === "complete" || item.status === "reconciliation";
          return (
            validStatus &&
            istItemDate >= istStartDate &&
            istItemDate <= istEndDate
          );
        });

        if (filtered.length === 0) {
          alert("No data found for the selected criteria");
          return;
        }

        downloadCSV(
          filtered,
          `survey_data_${form.supplyID}_${form.startDate}_${form.endDate}.csv`,
        );
        setModals((prev) => ({ ...prev, csv: false }));
      } catch (error) {
        console.error("Error downloading CSV:", error);
        alert("Error downloading CSV. Please try again.");
      }
    } else if (type === "statement") {
      setModals((prev) => ({ ...prev, statement: false, invoice: true }));
    }
  };

  const updateFormData = (type, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const toggleVisibility = (section) => {
    setVisibility((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleModal = (modal) => {
    setModals((prev) => ({ ...prev, [modal]: !prev[modal] }));
  };

  return (
    <div className="dashboard">
      {/* Filters Section */}
      <div className="filters-section">
        <FilterSection
          title="ALL BUYER"
          options={["CINT", "FUSION", "PASS"]}
          selected={filters.buyers}
          onSelectionChange={(selection) =>
            setFilters((prev) => ({ ...prev, buyers: selection }))
          }
          visible={visibility.buyers}
          onToggle={() => toggleVisibility("buyers")}
        />

        <FilterSection
          title="ALL SUPPLIER"
          options={suppliers}
          selected={filters.suppliers}
          onSelectionChange={(selection) =>
            setFilters((prev) => ({ ...prev, suppliers: selection }))
          }
          visible={visibility.suppliers}
          onToggle={() => toggleVisibility("suppliers")}
        />

        <FilterSection
          title="ALL COUNTRIES"
          options={countries}
          selected={filters.countries}
          onSelectionChange={(selection) =>
            setFilters((prev) => ({ ...prev, countries: selection }))
          }
          visible={visibility.countries}
          onToggle={() => toggleVisibility("countries")}
        />

        {/* Date & Time Filter */}
        <div className="filter-group">
          <div className="filter-header">
            <h3>DATE & TIME FILTER</h3>
          </div>
          <div className="date-time-filters">
            {["startDate", "endDate", "startTime", "endTime"].map((field) => (
              <label key={field}>
                {field
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
                :
                <input
                  type={field.includes("Date") ? "date" : "time"}
                  value={filters.dateRange[field]}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, [field]: e.target.value },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="filter-buttons">
          {[
            { label: "Reset Filter", action: resetFilters },
            {
              label: "Acuadmin",
              action: () =>
                (window.location.href = "https://acuadmin.acutusai.com/"),
            },
            { label: "STATEMENT", action: () => toggleModal("statement") },
            { label: "Download CSV", action: () => toggleModal("csv") },
            { label: "Refresh", action: fetchData },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="reset-btn"
              style={{ backgroundColor: "#00bf63", color: "#fff" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {/* Metrics Cards */}
      <div className="metrics-cards">
        <MetricCard title="Total Routed Entries" value={metrics.total} />
        <MetricCard
          title="Routed Conversion"
          value={`${metrics.conversionRate}%`}
        />
        <MetricCard title="Total Entries" value={metrics.nullParent} />
        <MetricCard
          title="Conversion %"
          value={`${metrics.conversionPercent}%`}
        />
        <MetricCard title="Completed Surveys" value={metrics.completed} />
        <MetricCard title="Reconciliation" value={metrics.reconciliation} />
        <MetricCard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toFixed(2)}`}
        />
        <MetricCard
          title="Total Margin"
          value={
            <span>
              {metrics.marginPercent}%
              <span
                style={{ fontSize: "0.4em", color: "#666", marginLeft: "8px" }}
              >
                (${metrics.marginAmount.toFixed(2)})
              </span>
            </span>
          }
        />
        <MetricCard
          title="Total Payable"
          value={`$${metrics.totalPayable.toFixed(2)}`}
        />
        <MetricCard
          title="EPC"
          value={
            metrics.total > 0
              ? `$${(metrics.totalRevenue / metrics.total).toFixed(2)}`
              : "$0.00"
          }
        />
        <MetricCard
          title="Avg. CPI"
          value={
            metrics.completed > 0
              ? `$${(metrics.totalRevenue / metrics.completed).toFixed(2)}`
              : "$0.00"
          }
        />
      </div>

      {/* Charts */}
      <div className="charts-section">
        <PieChartComponent
          title="Status Distribution"
          data={chartData.statusData}
          colorMap={CHART_COLORS.status}
        />
        <PieChartComponent
          title="Dtect Score Distribution"
          data={chartData.dtectData}
          colorMap={CHART_COLORS.dtect}
        />

        <div className="chart-container">
          <h3>Buyer Completed Surveys Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(chartData.buyerData).map(
                  ([name, value]) => ({ name, value }),
                )}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                dataKey="value"
              >
                {Object.entries(chartData.buyerData).map(([name], index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS.buyer[name]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value} completed surveys`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container chart-container-wide">
          <h3>Top 10 Supplier Performance</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData.top10Suppliers}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                fontSize={12}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "completed") return [value, "Completed Surveys"];
                  if (name === "total") return [value, "Total Hits"];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="#007bff" name="Total Hits" />
              <Bar
                dataKey="completed"
                fill="#28a745"
                name="Completed Surveys"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SupplyID-wise Conversion Table */}
        <div
          className="chart-container chart-container-wide"
          style={{ marginTop: 32 }}
        >
          <h3>SupplyID-wise Conversion</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  SupplyID
                </th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Total Hits
                </th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Completed
                </th>
                <th style={{ padding: "8px", border: "1px solid #ddd" }}>
                  Conversion %
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                (() => {
                  // Aggregate by supplyID with new conversion calculation
                  const supplyIdMap = {};
                  filteredData.forEach((item) => {
                    const supplyId =
                      item.supplierInfo?.id ||
                      item.supplyID ||
                      item.supplier_id ||
                      "Unknown";
                    const supplierInfo = SUPPLY_IDS.find(
                      (s) => s.id === supplyId,
                    ) || { id: supplyId, name: "Unknown" };

                    if (!supplyIdMap[supplyId]) {
                      supplyIdMap[supplyId] = {
                        total: 0,
                        completed: 0,
                        relevantTotal: 0,
                        name: supplierInfo.name,
                      };
                    }

                    supplyIdMap[supplyId].total++;

                    // Count all completed surveys regardless of Parent_id
                    if (item.status === "complete") {
                      supplyIdMap[supplyId].completed++;
                    }

                    // Only count relevant total for conversion rate calculation
                    if (
                      item.Parent_id === "N/A" &&
                      [
                        "complete",
                        "terminate",
                        "overquota",
                        "quality",
                      ].includes(item.status)
                    ) {
                      supplyIdMap[supplyId].relevantTotal++;
                    }
                  });
                  return supplyIdMap;
                })(),
              ).map(([supplyId, stats]) => (
                <tr key={supplyId}>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {stats.name}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {stats.total}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {stats.completed}
                  </td>
                  <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {stats.relevantTotal > 0
                      ? ((stats.completed / stats.relevantTotal) * 100).toFixed(
                          2,
                        )
                      : "0.00"}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {["statement", "csv"].map((type) => (
        <Modal
          key={type}
          title={type === "statement" ? "Generate Statement" : "Download CSV"}
          isOpen={modals[type]}
          onClose={() => toggleModal(type)}
        >
          <div className="form-group">
            <label>Supply ID:</label>
            <select
              value={formData[type].supplyID}
              onChange={(e) => updateFormData(type, "supplyID", e.target.value)}
            >
              <option value="">Select Supply ID</option>
              {SUPPLY_IDS.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.id} - {supplier.name}
                </option>
              ))}
            </select>
          </div>
          {["startDate", "endDate"].map((field) => (
            <div key={field} className="form-group">
              <label>
                {field === "startDate" ? "Start Date:" : "End Date:"}
              </label>
              <input
                type="date"
                value={formData[type][field]}
                onChange={(e) => updateFormData(type, field, e.target.value)}
              />
            </div>
          ))}
          <button
            onClick={() => handleFormSubmit(type)}
            className="apply-btn"
            style={{ backgroundColor: "#00bf63", color: "#fff" }}
          >
            {type === "statement" ? "Generate Statement" : "Download CSV"}
          </button>
        </Modal>
      ))}

      {/* Invoice Generator */}
      {modals.invoice && (
        <InvoiceGenerator
          userInfo={{ supplyID: formData.statement.supplyID }}
          startDate={formData.statement.startDate}
          endDate={formData.statement.endDate}
          startTime=""
          endTime=""
          allData={data}
          fetchSurveyData={fetchSurveyData}
          onClose={() => toggleModal("invoice")}
        />
      )}
    </div>
  );
};

export default SurveyDashboard;
