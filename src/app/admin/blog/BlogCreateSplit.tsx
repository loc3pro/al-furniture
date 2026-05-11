"use client";

import { useState } from "react";
import { useAdminRightPanel } from "@/components/admin/AdminRightPanel";
import panelStyles from "@/components/admin/AdminRightPanel.module.scss";
import { AdminRightPanelFooterCrud } from "@/components/admin/AdminRightPanelFooter";
import { BlogCreateForm } from "./BlogCreateForm";

const ADMIN_FORM_BLOG_CREATE = "admin-form-blog-create";

function BlogCreatePanel({ onClose }: { onClose: () => void }) {
  const [canSubmit, setCanSubmit] = useState(false);
  return (
    <div className={panelStyles.bodyStack}>
      <div className={panelStyles.bodyScroll}>
        <BlogCreateForm panelFormId={ADMIN_FORM_BLOG_CREATE} onValidityChange={setCanSubmit} />
      </div>
      <AdminRightPanelFooterCrud
        as="div"
        className={panelStyles.panelFooterBleed}
        create={
          <button
            type="submit"
            form={ADMIN_FORM_BLOG_CREATE}
            className="btn btn--primary adminToolbarBtn"
            disabled={!canSubmit}
            title={canSubmit ? "Tạo bài và mở trang soạn thảo" : "Nhập tiêu đề bài viết"}
          >
            Soạn nội dung
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

export function BlogCreateSplit() {
  const { openPanel, closePanel } = useAdminRightPanel();

  return (
    <button
      type="button"
      className="btn btn--primary adminToolbarBtn"
      title="Thêm bài blog mới"
      onClick={() =>
        openPanel({
          title: "Thêm bài blog",
          content: <BlogCreatePanel onClose={() => closePanel()} />,
        })
      }
    >
      + Thêm
    </button>
  );
}
