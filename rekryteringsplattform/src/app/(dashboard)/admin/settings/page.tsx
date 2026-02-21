"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";

export default function AdminSettingsPage() {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.settingsPageTitle")}</h1>
        <p className="text-muted-foreground">{t("admin.settingsPageSubtitle")}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.feesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("admin.defaultFeeLabel")}</label>
                <Input type="number" defaultValue="15" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("admin.platformShareLabel")}</label>
                <Input type="number" defaultValue="25" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("admin.guaranteePeriodLabel")}</label>
                <Input type="number" defaultValue="90" />
              </div>
            </div>
            <Button className="mt-4">{t("common.save")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.limitsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("admin.maxRecruitersPerJobLabel")}</label>
                <Input type="number" defaultValue="5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("admin.maxMandatesPerRecruiterLabel")}</label>
                <Input type="number" defaultValue="5" />
              </div>
            </div>
            <Button className="mt-4">{t("common.save")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.emailSettingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("admin.senderNameLabel")}</label>
                <Input defaultValue="Recruito" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("admin.senderAddressLabel")}</label>
                <Input defaultValue="noreply@rekryto.se" />
              </div>
            </div>
            <Button className="mt-4">{t("common.save")}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
