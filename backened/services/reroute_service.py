import heapq


class RerouteService:
    """Reroute simulation engine (Deliverable 9). Computes an alternate
    path via Dijkstra over a congestion-aware cost function and estimates
    the utilization impact of shifting traffic off a congested link."""

    NODES = ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]

    LINKS = {
        ("R1", "R2"): {"capacity": 1000, "utilization": 93},
        ("R2", "R3"): {"capacity": 1000, "utilization": 55},
        ("R1", "R3"): {"capacity": 500, "utilization": 40},
        ("R3", "R4"): {"capacity": 1000, "utilization": 48},
        ("R2", "R4"): {"capacity": 500, "utilization": 61},
        ("R4", "R5"): {"capacity": 1000, "utilization": 88},
        ("R3", "R6"): {"capacity": 500, "utilization": 35},
        ("R5", "R6"): {"capacity": 500, "utilization": 52},
        ("R6", "R7"): {"capacity": 1000, "utilization": 44},
        ("R5", "R7"): {"capacity": 500, "utilization": 39},
        ("R1", "R4"): {"capacity": 500, "utilization": 47},
    }

    CRITICAL_THRESHOLD = 80

    TRAFFIC_SHIFT_PCT = 30

    ROLES = {
        "R1": "Core", "R2": "Core", "R3": "Distribution",
        "R4": "Distribution", "R5": "Branch Edge",
        "R6": "Edge", "R7": "Branch Edge",
    }

    @staticmethod
    def _link_key(a, b):
        return tuple(sorted((a, b)))

    @classmethod
    def get_topology(cls):

        nodes = [
            {
                "id": node,
                "label": f"{node} {cls.ROLES.get(node, '')}"
            }
            for node in cls.NODES
        ]

        links = []

        for (a, b), attrs in cls.LINKS.items():

            utilization = attrs["utilization"]

            links.append({
                "source": a,
                "target": b,
                "capacity_mbps": attrs["capacity"],
                "utilization": utilization,
                "status": (
                    "congested"
                    if utilization >= cls.CRITICAL_THRESHOLD
                    else "warning"
                    if utilization >= 60
                    else "normal"
                )
            })

        return {"nodes": nodes, "links": links}

    @classmethod
    def _find_path(cls, start, end):
        """Dijkstra over congestion penalties."""

        graph = {}

        for (a, b), attrs in cls.LINKS.items():

            graph.setdefault(a, []).append((b, attrs["utilization"]))

            graph.setdefault(b, []).append((a, attrs["utilization"]))

        distances = {node: float("inf") for node in graph}

        previous = {}

        distances[start] = 0

        queue = [(0, start)]

        while queue:

            distance, node = heapq.heappop(queue)

            if distance > distances[node]:
                continue

            for neighbor, utilization in graph[node]:

                penalty = (
                    (utilization / 100.0 * 1.5)
                    + (0.15 if utilization >= 85 else 0)
                    + (1.0 if utilization >= 93 else 0)
                )

                new_distance = distance + penalty

                if new_distance < distances[neighbor]:

                    distances[neighbor] = new_distance

                    previous[neighbor] = node

                    heapq.heappush(queue, (new_distance, neighbor))

        if end not in previous and start != end:
            return None

        path = [end]

        node = end

        while node != start:

            node = previous.get(node)

            if node is None:
                return None

            path.append(node)

        path.reverse()

        return path

    @classmethod
    def _path_utilization(cls, path):

        if not path or len(path) < 2:
            return None

        utilisations = []

        for index in range(len(path) - 1):

            key = cls._link_key(path[index], path[index + 1])

            utilisations.append(cls.LINKS[key]["utilization"])

        return utilisations

    @classmethod
    def simulate(cls, destination_ip=None, shift_pct=None):

        shift_pct = shift_pct or cls.TRAFFIC_SHIFT_PCT

        congested = max(
            cls.LINKS.items(),
            key=lambda item: item[1]["utilization"]
        )

        (cong_a, cong_b), attrs = congested

        original_util = attrs["utilization"]

        end = "R5"

        if destination_ip:

            last_octet = 0

            try:

                last_octet = int(
                    str(destination_ip).split(".")[-1]
                )

            except (ValueError, IndexError, AttributeError):

                last_octet = 0

            node_pick = ["R5", "R6", "R7", "R4", "R3", "R2"]

            end = node_pick[last_octet % len(node_pick)]

        alternate = None

        for candidate_end in (end, "R5", "R7"):

            alternate = cls._find_path("R1", candidate_end)

            if alternate and cls._link_key(
                alternate[0], alternate[1]
            ) != cls._link_key(cong_a, cong_b):
                break

        if not alternate:
            alternate = cls._find_path("R1", "R7")

        alt_util = cls._path_utilization(alternate) or []

        avg_alt_util = (
            sum(alt_util) / len(alt_util) if alt_util else original_util
        )

        shifted_load = original_util * (shift_pct / 100.0)

        predicted_util = round(
            max(
                original_util - shifted_load
                + (shifted_load * avg_alt_util / 100.0),
                5
            ),
            1
        )

        improvement = round(
            (original_util - predicted_util)
            / max(original_util, 1) * 100,
            1
        )

        is_beneficial = original_util >= 70 and improvement > 5

        return {
            "congested_link": f"{cong_a} <-> {cong_b}",
            "congested_link_utilization": original_util,
            "shift_pct": shift_pct,
            "alternate_path": alternate or [],
            "alternate_path_utilization": alt_util,
            "avg_alternate_path_utilization": round(avg_alt_util, 1),
            "predicted_congested_utilization": predicted_util,
            "predicted_improvement_pct": improvement,
            "is_beneficial": is_beneficial,
            "recommendation": (
                f"Shift {shift_pct}% of {cong_a} <-> {cong_b} traffic "
                f"through {' -> '.join(alternate or [])}. Predicted "
                f"link utilization drops from {original_util}% to "
                f"{predicted_util}%."
                if is_beneficial
                else
                f"No beneficial reroute available. Link "
                f"{cong_a} <-> {cong_b} is at {original_util}% "
                f"utilization; monitor and plan a capacity upgrade."
            )
        }
