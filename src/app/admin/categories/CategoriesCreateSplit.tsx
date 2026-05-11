"use client";

import { useState } from "react";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import panelStyles from "@/components/admin/AdminRightPanel.module.scss";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";
import { CategoryAddForm } from "./CategoryAddForm";
import styles from "./categories.module.scss";

const ADMIN_FORM_CATEGORY_ADD = "admin-form-category-add";

function CategoryCreatePanel({ onClose }: { onClose: () => void }) {
  const [canSubmit, setCanSubmit] = useState(false);
  return (
    <div className={panelStyles.bodyStack}>
      <div className={panelStyles.bodyScroll}>
        <CategoryAddForm embeddedInPanel panelFormId={ADMIN_FORM_CATEGORY_ADD} onValidityChange={setCanSubmit} />
      </div>
      <AdminRightPanelFooterCrud
        as="div"
        className={panelStyles.panelFooterBleed}
        create={
          <button
            type="submit"
            form={ADMIN_FORM_CATEGORY_ADD}
            className="btn btn--primary adminToolbarBtn"
            disabled={!canSubmit}
            title={canSubmit ? "Tạo danh mục" : "Nhập tên VI và EN"}
          >
            Tạo
          </button>
        }
        delete={
          <button type="button" className="btn btn--ghost adminCancelGhost adminToolbarBtn" onClick={onClose}>
            Hủy
          </button>
        }
      />
    </div>
  );
}

export function CategoriesCreateSplit() {
  const { openPanel, closePanel } = useAdminRightPanel();

  return (
    <button
      type="button"
      className={`btn btn--primary adminToolbarBtn ${styles.categoryCreateBtn}`}
      title="Thêm danh mục mới"
      onClick={() =>
        openPanel({
          title: "Thêm danh mục",
          content: <CategoryCreatePanel onClose={() => closePanel()} />,
        })
      }
    >
      + Thêm
    </button>
  );
}
