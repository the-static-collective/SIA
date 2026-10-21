import { createFileRoute } from "@tanstack/react-router";
import { OrreryApp } from "@/components/orrery/OrreryApp";

export const Route = createFileRoute("/")({ component: OrreryApp });
