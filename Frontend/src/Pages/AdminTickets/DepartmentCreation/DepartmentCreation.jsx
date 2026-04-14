import { useState, useEffect } from "react";
import { Grid, Typography, Box } from "@mui/material";

import {
  showPostSuccess,
  showPostError,
  showAlert,
  deleteAlert,
} from "../../../Components/swal_alert";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../../Services/DeptCreation.services";

import DepartmentCreationForm from "./DepartmentCreationForm";
import DepartmentCreationTable from "./DepartmentCreationTable";

const DepartmentCreation = () => {
  const [form, setForm] = useState({ cust_dept_name: "", short_name: "" });
  const [errors, setErrors] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filteredRows, setFilteredRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await getDepartments();
      const data = res?.items ?? [];
      setRows(data);
      setFilteredRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const validate = () => {
    const e = {};
    if (!form.cust_dept_name.trim())
      e.cust_dept_name = "Department name is required";
    if (!form.short_name.trim()) e.short_name = "Short name is required";
    else if (form.short_name.trim().length > 5)
      e.short_name = "Short name must be 5 characters or less";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFormChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      const payload = {
        cust_dept_name: form.cust_dept_name.trim().toUpperCase(),
        short_name: form.short_name.trim().toUpperCase(),
      };
      const res = await createDepartment(payload);
      if (res?.Status === 1) {
        showPostSuccess("Department Created Successfully");
        fetchDepartments();
        handleReset();
      }
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (statusCode === 409)
        showAlert("warning", "Already Exists", apiMessage);
      else showPostError(apiMessage || "Department Creation Failed");
    }
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    try {
      const payload = {
        cust_dept_id: editId,
        cust_dept_name: form.cust_dept_name.trim().toUpperCase(),
        short_name: form.short_name.trim().toUpperCase(),
      };
      const res = await updateDepartment(payload);
      if (res?.Status === 1) {
        showPostSuccess("Department Updated Successfully");
        fetchDepartments();
        handleReset();
      }
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (statusCode === 409)
        showAlert("warning", "Already Exists", apiMessage);
      else showPostError(apiMessage || "Department Update Failed");
    }
  };

  const handleEdit = (row) => {
    setIsEditing(true);
    setEditId(row.CUST_DEPT_ID);
    setForm({
      cust_dept_name: row.CUST_DEPT_NAME ?? "",
      short_name: row.SHORT_NAME ?? "",
    });
    setErrors({});
  };

  const handleReset = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ cust_dept_name: "", short_name: "" });
    setErrors({});
  };

  const handleDelete = async (cust_dept_id) => {
    const confirm = await deleteAlert();
    if (!confirm.isConfirmed) return;
    try {
      const res = await deleteDepartment(cust_dept_id);
      if (res?.Status === 1) {
        showPostSuccess("Department Deleted Successfully");
        fetchDepartments();
      }
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (statusCode === 409) showAlert("warning", "Cannot Delete", apiMessage);
      else showPostError(apiMessage || "Department Deletion Failed");
    }
  };

  return (
    <Box sx={{ p: 2.5, bgcolor: "grey.50" }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={600}>
          Department Creation & Management
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6.2 }}>
          <DepartmentCreationForm
            form={form}
            errors={errors}
            isEditing={isEditing}
            onChange={handleFormChange}
            onSave={handleSave}
            onUpdate={handleUpdate}
            onReset={handleReset}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6.2 }}>
          <DepartmentCreationTable
            loading={loading}
            filteredRows={filteredRows}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(val) => {
              setRowsPerPage(val);
              setPage(0);
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DepartmentCreation;
