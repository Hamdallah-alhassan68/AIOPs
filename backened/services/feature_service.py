import pandas as pd


class FeatureService:

    @staticmethod
    def create_features(flows):

        if not flows:
            return None

        df = pd.DataFrame(flows)

        # Basic traffic features
        n_flows = len(df)

        n_packets = int(
            df["packets"].sum()
        )

        n_bytes = int(
            df["bytes"].sum()
        )

        # Unique destinations
        n_dest_ip = int(
            df["destination_ip"].nunique()
        )

        n_dest_ports = int(
            df["destination_port"].nunique()
        )

        # Protocol statistics
        tcp_packets = df.loc[
            df["protocol"].str.upper() == "TCP",
            "packets"
        ].sum()

        udp_packets = df.loc[
            df["protocol"].str.upper() == "UDP",
            "packets"
        ].sum()

        total_packets = tcp_packets + udp_packets

        if total_packets > 0:

            tcp_udp_ratio_packets = (
                tcp_packets / total_packets
            )

        else:

            tcp_udp_ratio_packets = 0.0


        # TCP/UDP byte ratio
        tcp_bytes = df.loc[
            df["protocol"].str.upper() == "TCP",
            "bytes"
        ].sum()

        udp_bytes = df.loc[
            df["protocol"].str.upper() == "UDP",
            "bytes"
        ].sum()

        total_bytes = tcp_bytes + udp_bytes

        if total_bytes > 0:

            tcp_udp_ratio_bytes = (
                tcp_bytes / total_bytes
            )

        else:

            tcp_udp_ratio_bytes = 0.0


        # Direction ratios
        dir_ratio_packets = 1.0

        dir_ratio_bytes = 1.0


        # Average flow characteristics
        avg_duration = float(
            df["duration"].mean()
        )

        avg_ttl = float(
            df["ttl"].mean()
        )


        return {

            "n_flows": n_flows,

            "n_packets": n_packets,

            "n_bytes": n_bytes,

            "n_dest_asn": 1,

            "n_dest_ports": n_dest_ports,

            "n_dest_ip": n_dest_ip,

            "tcp_udp_ratio_packets":
                tcp_udp_ratio_packets,

            "tcp_udp_ratio_bytes":
                tcp_udp_ratio_bytes,

            "dir_ratio_packets":
                dir_ratio_packets,

            "dir_ratio_bytes":
                dir_ratio_bytes,

            "avg_duration":
                avg_duration,

            "avg_ttl":
                avg_ttl
        }