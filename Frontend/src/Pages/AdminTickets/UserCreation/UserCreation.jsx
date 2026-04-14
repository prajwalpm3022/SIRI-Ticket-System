import { useState, useEffect } from "react";
import { Grid, Box, Typography } from "@mui/material";
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
  loginType: null,
  active: true,
};

const UserCreation = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState({ department: null, name: "" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const cust_id = secureLocalStorage.getItem("USER_ID");

  // ── Data fetching ──────────────────────────────────────────────────────────

  const getuserGridData = async () => {
    setLoading(true);
    try {
      const res = await getCustLogins(cust_id);
      const data = res?.items ?? [];
      setRows(Array.isArray(data) ? data : []);
      setFilteredRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("getCustLogins error:", error);
      setRows([]);
      setFilteredRows([]);
    } finally {
      setLoading(false);
    }
  };

  const getDepartments = async () => {
    try {
      const res = await getCustDepartments();
      setDepartments(res?.items ?? []);
    } catch (error) {
      console.error("getCustDepartments error:", error);
    }
  };

  useEffect(() => {
    getuserGridData();
    getDepartments();
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateField = (field, value, updatedForm) => {
    let msg = "";

    switch (field) {
      case "department":
        if (!value) msg = "Department is required";
        break;
      case "name":
        if (!value?.trim()) msg = "Name is required";
        break;
      case "username":
        if (!value?.trim()) msg = "Username is required";
        break;
      case "email":
        if (!value?.trim()) msg = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(value)) msg = "Enter a valid email";
        break;
      case "mobile": {
        const mob = String(value ?? "").trim();
        if (!mob) {
          msg = "Mobile is required";
        } else if (!/^\d+$/.test(mob)) {
          msg = "Mobile must contain numbers only";
        } else if (mob.length !== 10) {
          msg = "Mobile must be exactly 10 digits";
        }
        break;
      }
      case "password":
        if (!value) {
          msg = "Password is required";
        } else if (value.length < 8) {
          msg = "Password must be at least 8 characters";
        } else if (!/[A-Z]/.test(value)) {
          msg = "Password must contain at least 1 uppercase letter";
        } else if (!/[a-z]/.test(value)) {
          msg = "Password must contain at least 1 lowercase letter";
        } else if (!/[0-9]/.test(value)) {
          msg = "Password must contain at least 1 number";
        } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
          msg = "Password must contain at least 1 special character";
        }
        if (
          updatedForm?.confirmPassword &&
          value !== updatedForm.confirmPassword
        ) {
          setErrors((e) => ({
            ...e,
            confirmPassword: "Passwords do not match",
          }));
        } else if (updatedForm?.confirmPassword) {
          setErrors((e) => ({ ...e, confirmPassword: "" }));
        }
        break;
      case "confirmPassword":
        if (!value) msg = "Please confirm your password";
        else if (value !== updatedForm?.password)
          msg = "Passwords do not match";
        break;
      case "loginType":
        if (!value) msg = "Login type is required";
        break;
      default:
        break;
    }

    setErrors((e) => ({ ...e, [field]: msg }));
  };

  const handleFieldChange = (field, value) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      validateField(field, value, updated);
      return updated;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.department) e.department = "Department is required";
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    const mobile = String(form.mobile ?? "").trim();
    if (!mobile) {
      e.mobile = "Mobile is required";
    } else if (!/^\d+$/.test(mobile)) {
      e.mobile = "Mobile must contain numbers only";
    } else if (mobile.length !== 10) {
      e.mobile = "Mobile must be exactly 10 digits";
    }
    if (!form.password) {
      e.password = "Password is required";
    } else if (form.password.length < 8) {
      e.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.password)) {
      e.password = "Password must contain at least 1 uppercase letter";
    } else if (!/[a-z]/.test(form.password)) {
      e.password = "Password must contain at least 1 lowercase letter";
    } else if (!/[0-9]/.test(form.password)) {
      e.password = "Password must contain at least 1 number";
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password)) {
      e.password = "Password must contain at least 1 special character";
    }
    if (!form.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!form.loginType) e.loginType = "Login type is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      if (!validate()) return;
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
        getuserGridData();
        handleReset();
      }
    } catch (error) {
      console.error("handleSave error:", error);
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (statusCode === 409 && apiMessage) {
        showAlert("warning", "Already Exists", apiMessage);
      } else if (statusCode === 400 && apiMessage) {
        showAlert("warning", "Validation Error", apiMessage);
      } else {
        showPostError(apiMessage || "User Creation Failed");
      }
    }
  };

  const handleUpdate = async () => {
    try {
      if (!validate()) return;
      const payload = {
        cust_login_id: form?.cust_login_id,
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
      const res = await updateCustUserLogin(payload);
      if (res?.Status === 1) {
        showPostSuccess("User Updated Successfully");
        getuserGridData();
        handleReset();
      }
    } catch (error) {
      console.error("handleUpdate error:", error);
      const statusCode = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      if (statusCode === 404) {
        showAlert("warning", "User Not Found", apiMessage);
      } else if (statusCode === 409) {
        showAlert("warning", "Already Exists", apiMessage);
      } else if (statusCode === 400) {
        showAlert("warning", "Validation Error", apiMessage);
      } else {
        showPostError(apiMessage || "User Update Failed");
      }
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
      password: row.CUST_PASSWORD ?? "",
      confirmPassword: row.CUST_PASSWORD ?? "",
      loginType: LOGIN_TYPES.find((l) => l.value === row.LOGIN_TYPE) ?? null,
      active: row.ACTIVE === "Y" || row.ACTIVE === 1,
    });
    setErrors({});
  };

  const handleReset = () => {
    setIsEditing(false);
    setForm(INITIAL_FORM);
    setErrors({});
  };

  // ── Search ─────────────────────────────────────────────────────────────────

  const handleSearchChange = (field, value) => {
    setSearch((s) => ({ ...s, [field]: value }));
  };

  const handleSearch = () => {
    let result = [...rows];
    if (search.department) {
      result = result.filter(
        (r) => r.CUST_DEPT_ID === search.department.CUST_DEPT_ID,
      );
    }
    if (search.name.trim()) {
      result = result.filter((r) =>
        r.NAME?.toLowerCase().includes(search.name.trim().toLowerCase()),
      );
    }
    setFilteredRows(result);
    setPage(0);
  };

  const handleSearchReset = () => {
    setSearch({ department: null, name: "" });
    setFilteredRows(rows);
    setPage(0);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 2.5, bgcolor: "grey.50" }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" fontWeight={600}>
          User Management
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Form */}
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
            onUpdate={handleUpdate}
            onReset={handleReset}
          />
        </Grid>

        {/* Table */}
        <Grid size={{ xs: 12, md: 8 }}>
          <UserCreationTable
            departments={departments}
            rows={rows}
            filteredRows={filteredRows}
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
