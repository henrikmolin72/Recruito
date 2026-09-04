import { Activity, Building2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPresenceHistory } from "@/lib/actions/presence";
import { getDictionary } from "@/i18n/server";
import { formatDate } from "@/lib/utils";

export default async function AdminPresencePage() {
    const [{ onlineNow, days }, dict] = await Promise.all([getPresenceHistory(), getDictionary()]);
    const a = dict.admin;
    const groups = [
        { key: "recruiter", icon: Users, label: a.recruitersOnline, users: onlineNow.filter((u) => u.role === "recruiter") },
        { key: "company", icon: Building2, label: a.companiesOnline, users: onlineNow.filter((u) => u.role === "company") },
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold">{a.presenceTitle}</h1>
                <p className="text-muted-foreground">{a.presenceSubtitle}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {groups.map(({ key, icon: Icon, label, users }) => (
                    <Card key={key}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Icon className="h-5 w-5" /> {label}: {users.length}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {users.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{a.presenceNobodyOnline}</p>
                            ) : (
                                <ul className="space-y-1.5 text-sm">
                                    {users.map((u) => (
                                        <li key={u.user_id} className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {u.full_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" /> {a.presenceHistoryTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {days.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{a.presenceNoData}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-widest text-slate-400">
                                        <th className="py-2">{a.presenceDate}</th>
                                        <th className="py-2 text-right">{a.recruitersOnline}</th>
                                        <th className="py-2 text-right">{a.companiesOnline}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {days.map((d) => (
                                        <tr key={d.day} className="border-t border-slate-100">
                                            <td className="py-2">{formatDate(d.day)}</td>
                                            <td className="py-2 text-right tabular-nums">{d.recruiters}</td>
                                            <td className="py-2 text-right tabular-nums">{d.companies}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
