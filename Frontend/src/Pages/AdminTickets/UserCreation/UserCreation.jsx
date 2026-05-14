import { useState } from "react";
import { Grid, Box, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import secureLocalStorage from "react-secure-storage";
import {
  getCustLogins,
  getCustDepartments,
  createCustUserLogin,
  updateCustUserLogin,
} from "../../../Services/UserCreation.services";
import {
  showPostSuccess,
  showPostError,
  showAlert,
} from "../../../Components/swal_alert";
import UserCreationForm, { LOGIN_TYPES } from "./UserCreationForm";
import UserCreationTable from "./userCreationTable";

const INITIAL_FORM = {
  cust_login_id: null,
  department: null,
  name: "",
  username: "",
  email: "",
  mobile: "",
  password: "",
  confirmPassword: "",
  oldPassword: "",
  newPassword: "",
  loginType: null,
  active: true,
};

const UserCreation = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [filteredRows, setFilteredRows] = useState(null); // null = show all
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState({ department: null, name: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formLoading, setFormLoading] = useState(false);

  const cust_id = secureLocalStorage.getItem("USER_ID");
  const queryClient = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: rows = [], isFetching: loading } = useQuery({
    queryKey: ["custLogins", cust_id],
    queryFn: async () => {
      const res = await getCustLogins(cust_id);
      const data = res?.items ?? [];
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["custDepartments"],
    queryFn: async () => {
      const res = await getCustDepartments();
      return res?.items ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Validation ────────────────────────────────────────────────────────────

  const getFieldError = (field, value, form) => {
    switch (field) {
      case "department":
        if (!value) return "Department is required";
        break;
      case "name":
        if (!value?.trim()) return "Name is required";
        break;
      case "username":
        if (!value?.trim()) return "Username is required";
        break;
      case "email":
        if (!value?.trim()) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(value)) return "Enter a valid email";
        break;
      case "mobile": {
        const mob = String(value ?? "").trim();
        if (!mob) return "Mobile is required";
        if (!/^\d+$/.test(mob)) return "Mobile must contain numbers only";
        if (mob.length !== 10) return "Mobile must be exactly 10 digits";
        break;
      }
      case "password":
        if (!form.isEditing && !value) return "Password is required";
        if (value && value.length < 8)
          return "Password must be at least 8 characters";
        break;
      case "confirmPassword":
        if (!form.isEditing && !value) return "Please confirm your password";
        if (value !== form.password) return "Passwords do not match";
        break;
      case "loginType":
        if (!value) return "Login type is required";
        break;
      default:
        break;
    }
    return "";
  };

  const validateField = (field, value, updatedForm) => {
    const error = getFieldError(field, value, { ...updatedForm, isEditing });
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validate = () => {
    const newErrors = {};
    Object.keys(form).forEach((field) => {
      const error = getFieldError(field, form[field], { ...form, isEditing });
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      validateField(field, value, updated);
      return updated;
    });
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    setFormLoading(true);
    try {
      const payload = {
        cust_id,
        cust_dept_id: form?.department?.CUST_DEPT_ID,
        cust_user_id: form?.username,
        cust_password: form?.password,
        name: form?.name,
        email: form?.email,
        login_type: form?.loginType?.value,
        mobile: form?.mobile,
        active: form?.active ? "Y" : "N",
      };
      const res = await createCustUserLogin(payload);
      if (res?.Status === 1) {
        showPostSuccess("User Created Successfully");
        queryClient.invalidateQueries({ queryKey: ["custLogins", cust_id] });
        handleReset();
      }
    } catch (error) {
      console.error("handleSave error:", error);
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (statusCode === 409)
        showAlert("warning", "Already Exists", apiMessage);
      else if (statusCode === 400)
        showAlert("warning", "Validation Error", apiMessage);
      else showPostError(apiMessage || "User Creation Failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (row) => {
    setIsEditing(true);
    setForm({
      cust_login_id: row.CUST_LOGIN_ID,
      department:
        departments.find((d) => d.CUST_DEPT_ID === row.CUST_DEPT_ID) ?? null,
      name: row.NAME ?? "",
      username: row.CUST_USER_ID ?? "",
      email: row.EMAIL ?? "",
      mobile: String(row.MOBILE ?? ""),
      oldPassword: row.CUST_PASSWORD ?? "",
      newPassword: "",
      password: "",
      confirmPassword: "",
      loginType: LOGIN_TYPES.find((l) => l.value === row.LOGIN_TYPE) ?? null,
      active: row.ACTIVE === "Y" || row.ACTIVE === 1,
    });
    setErrors({});
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setFormLoading(true);
    try {
      const payload = {
        cust_login_id: form?.cust_login_id,
        cust_id,
        cust_dept_id: form?.department?.CUST_DEPT_ID,
        cust_user_id: form?.username,
        name: form?.name,
        email: form?.email,
        login_type: form?.loginType?.value,
        mobile: form?.mobile,
        active: form?.active ? "Y" : "N",
        ...(form.newPassword?.trim() && {
          old_password: form.oldPassword,
          new_password: form.newPassword,
        }),
      };
      const res = await updateCustUserLogin(payload);
      if (res?.Status === 1) {
        showPostSuccess("User Updated Successfully");
        queryClient.invalidateQueries({ queryKey: ["custLogins", cust_id] });
        handleReset();
      }
    } catch (error) {
      console.error("handleUpdate error:", error);
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (statusCode === 404)
        showAlert("warning", "User Not Found", apiMessage);
      else if (statusCode === 409)
        showAlert("warning", "Already Exists", apiMessage);
      else if (statusCode === 400)
        showAlert("warning", "Validation Error", apiMessage);
      else showPostError(apiMessage || "User Update Failed");
    } finally {
      setFormLoading(false);
    }
  };

  const handleReset = () => {
    setIsEditing(false);
    setForm(INITIAL_FORM);
    setErrors({});
  };

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearchChange = (field, value) => {
    setSearch((s) => ({ ...s, [field]: value }));
  };

  const handleSearch = () => {
    let result = [...rows];
    if (search.department)
      result = result.filter(
        (r) => r.CUST_DEPT_ID === search.department.CUST_DEPT_ID,
      );
    if (search.name.trim())
      result = result.filter((r) =>
        r.NAME?.toLowerCase().includes(search.name.trim().toLowerCase()),
      );
    setFilteredRows(result);
    setPage(0);
  };

  const handleSearchReset = () => {
    setSearch({ department: null, name: "" });
    setFilteredRows(null);
    setPage(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const displayRows = filteredRows ?? rows;

  return (
    <Box sx={{ p: 2.5, bgcolor: "grey.50" }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" fontWeight={600}>
          User Management
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <UserCreationForm
            form={form}
            errors={errors}
            departments={departments}
            isEditing={isEditing}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            setShowPassword={setShowPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            onFieldChange={handleFieldChange}
            onSave={handleSave}
            loading={formLoading}
            onUpdate={handleUpdate}
            onReset={handleReset}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <UserCreationTable
            departments={departments}
            rows={rows}
            filteredRows={displayRows}
            loading={loading}
            search={search}
            page={page}
            rowsPerPage={rowsPerPage}
            onSearchChange={handleSearchChange}
            onSearch={handleSearch}
            onSearchReset={handleSearchReset}
            onPageChange={setPage}
            onRowsPerPageChange={(val) => {
              setRowsPerPage(val);
              setPage(0);
            }}
            onEdit={handleEdit}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserCreation;
