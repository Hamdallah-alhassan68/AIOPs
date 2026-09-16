class RecommendationService:

    """Maps a probable root cause into actionable operator guidance.

    Each recommendation is structured so it can be rendered as an
    actionable checklist in the NOC dashboard and later extended to
    drive automated remediation playbooks / runbooks.
    """

    _ROOT_CAUSE_ACTIONS = {

        "Traffic Spike": [
            {
                "action": "Monitor bandwidth utilization",
                "owner": "NOC",
                "priority": "High"
            },
            {
                "action": "Investigate top source hosts",
                "owner": "Security",
                "priority": "High"
            },
            {
                "action": "Evaluate traffic shaping / load balancing",
                "owner": "Network Engineering",
                "priority": "Medium"
            },
            {
                "action": "Verify peering and transit links",
                "owner": "NOC",
                "priority": "Medium"
            }
        ],

        "Possible Port Scan": [
            {
                "action": "Inspect and quarantine source IP",
                "owner": "Security",
                "priority": "Critical"
            },
            {
                "action": "Enable / tighten firewall deny rules",
                "owner": "Security",
                "priority": "High"
            },
            {
                "action": "Correlate with IDS / IPS alerts",
                "owner": "SOC",
                "priority": "High"
            },
            {
                "action": "Enable anomaly signatures on the collector",
                "owner": "NOC",
                "priority": "Medium"
            }
        ],

        "Abnormal Data Transfer": [
            {
                "action": "Check for data exfiltration indicators",
                "owner": "Security",
                "priority": "Critical"
            },
            {
                "action": "Inspect affected hosts and sessions",
                "owner": "SOC",
                "priority": "High"
            },
            {
                "action": "Review access and authentication logs",
                "owner": "Security",
                "priority": "High"
            },
            {
                "action": "Restrict outbound traffic to known assets",
                "owner": "Network Engineering",
                "priority": "Medium"
            }
        ],

        "WAN Congestion": [
            {
                "action": "Shut down or de-prioritize non-critical flows",
                "owner": "NOC",
                "priority": "High"
            },
            {
                "action": "Simulate reroute over alternate path",
                "owner": "Network Engineering",
                "priority": "High"
            },
            {
                "action": "Review QOS / CoS policy on the edge",
                "owner": "Network Engineering",
                "priority": "Medium"
            },
            {
                "action": "Plan capacity upgrade for the congested link",
                "owner": "Carrier Team",
                "priority": "Low"
            }
        ],

        "Normal Variation": [
            {
                "action": "Continue monitoring",
                "owner": "NOC",
                "priority": "Low"
            }
        ],

        "Unknown": [
            {
                "action": "Investigate manually",
                "owner": "NOC",
                "priority": "Medium"
            }
        ]
    }

    _SEVERITY_ADDITIONS = {
        "Critical": [
            {
                "action": "Escalate to on-call incident manager",
                "owner": "NOC Lead",
                "priority": "Critical"
            },
            {
                "action": "Open bridge call with stakeholders",
                "owner": "Incident Manager",
                "priority": "Critical"
            }
        ],
        "High Risk": [
            {
                "action": "Acknowledge and assign a primary responder",
                "owner": "NOC",
                "priority": "High"
            }
        ]
    }

    @staticmethod
    def recommend(root_cause, severity="Healthy"):

        actions = list(
            RecommendationService._ROOT_CAUSE_ACTIONS.get(
                root_cause,
                RecommendationService._ROOT_CAUSE_ACTIONS[
                    "Unknown"
                ]
            )
        )

        actions.extend(
            RecommendationService._SEVERITY_ADDITIONS.get(
                severity, []
            )
        )

        return actions